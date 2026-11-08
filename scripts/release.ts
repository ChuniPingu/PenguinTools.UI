#!/usr/bin/env bun
import { createReadStream, existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve, sep } from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { $ } from "bun";
import { assertRequiredEnv, envOrDefault, requireEnv, S3_REQUIRED_ENV } from "./env";
import { requireUpdaterSigningKey } from "./updater-env";
import {
  createUpdaterManifest,
  publishRelease,
  resolveReleaseIdentity,
  trimTrailingSlashes,
} from "./release-github";

const projectRoot = resolve(import.meta.dir, "..");
const defaultRepository = "ChuniPingu/PenguinTools.UI";

type Args = {
  tag?: string;
  title?: string;
  notes?: string;
  notesFile?: string;
  repository: string;
  draft: boolean;
  prerelease: boolean;
  skipBuild: boolean;
  allowDirty: boolean;
  clobber: boolean;
  skipS3: boolean;
};

function usage(): never {
  console.error(`Usage: bun scripts/release.ts [options]

Options:
  --tag=vX.Y.Z          UI tag (default: v{tauri.conf.json version})
  --title=...           Release title (default: PenguinTools.UI v{UI version})
  --notes=...           Release notes text (overrides changelog)
  --notes-file=path     Release notes from file (overrides changelog)
  --repository=owner/repo  UI repo (default: ${defaultRepository})
  --draft               Prepare a draft; skip object storage
  --prerelease          Publish a prerelease; skip the stable object-storage mirror
  --skip-build          Reuse existing NSIS artifacts
  --allow-dirty         Allow a dirty working tree
  --clobber             Overwrite existing GitHub release assets
  --skip-s3             Skip S3-compatible upload

By default, release notes are read from docs/changelog/X.Y.Z.md (matching tauri.conf.json version).
`);
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    repository: defaultRepository,
    draft: false,
    prerelease: false,
    skipBuild: false,
    allowDirty: false,
    clobber: false,
    skipS3: false,
  };

  for (const arg of argv) parseArgument(args, arg);
  return args;
}

function parseArgument(args: Args, arg: string): void {
  if (arg === "--help" || arg === "-h") usage();
  const valueOptions = {
    "--tag": "tag",
    "--title": "title",
    "--notes": "notes",
    "--notes-file": "notesFile",
    "--repository": "repository",
  } as const;
  const flags = {
    "--draft": "draft",
    "--prerelease": "prerelease",
    "--skip-build": "skipBuild",
    "--allow-dirty": "allowDirty",
    "--clobber": "clobber",
    "--skip-s3": "skipS3",
  } as const;
  for (const [option, key] of Object.entries(valueOptions)) {
    if (arg.startsWith(`${option}=`)) {
      args[key] = arg.slice(option.length + 1);
      return;
    }
  }
  for (const [option, key] of Object.entries(flags)) {
    if (arg === option) {
      args[key] = true;
      return;
    }
  }
  throw new Error(`Unknown argument '${arg}'. Pass --help for usage.`);
}

async function assertReleasePrerequisites(args: Args): Promise<void> {
  if (!args.skipS3 && !args.draft && !args.prerelease) {
    assertRequiredEnv(S3_REQUIRED_ENV, {
      hint: "Set them in .env, or pass --skip-s3 to publish to GitHub only.",
    });
    // Fail early if updater public base cannot be derived from tauri.conf.json.
    await getPublicReleaseBase();
  }

  if (!args.skipBuild) {
    requireUpdaterSigningKey();
  }
}

function assertCommand(name: string): void {
  if (!Bun.which(name)) {
    throw new Error(`Required command '${name}' was not found on PATH.`);
  }
}

type TauriConf = {
  version?: string;
  plugins?: {
    updater?: {
      endpoints?: string[];
    };
  };
};

async function readTauriConf(): Promise<TauriConf> {
  const tauriConfPath = join(projectRoot, "src-tauri", "tauri.conf.json");
  return (await Bun.file(tauriConfPath).json()) as TauriConf;
}

async function getProjectVersion(): Promise<string> {
  const conf = await readTauriConf();
  if (!conf.version) {
    throw new Error("tauri.conf.json is missing version.");
  }
  return conf.version;
}

function publicBaseFromUpdaterEndpoint(endpoint: string): string {
  const trimmed = trimTrailingSlashes(endpoint.trim());
  const suffix = "/latest.json";
  if (!trimmed.endsWith(suffix)) {
    throw new Error(
      `Updater endpoint '${endpoint}' must end with '${suffix}' so the S3 public base can be derived.`,
    );
  }
  return trimmed.slice(0, -suffix.length);
}

function s3KeyPrefixFromPublicBase(publicBase: string): string {
  let pathname: string;
  try {
    pathname = new URL(publicBase).pathname;
  } catch {
    throw new Error(`Invalid public release base URL '${publicBase}'.`);
  }
  let start = 0;
  while (pathname[start] === "/") start++;
  return trimTrailingSlashes(pathname.slice(start));
}

function joinS3Key(...parts: string[]): string {
  return parts
    .flatMap((part) => part.split("/"))
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

async function getPublicReleaseBase(): Promise<string> {
  const conf = await readTauriConf();
  const endpoint = conf.plugins?.updater?.endpoints?.[0]?.trim();
  if (!endpoint) {
    throw new Error("tauri.conf.json is missing plugins.updater.endpoints[0].");
  }
  return publicBaseFromUpdaterEndpoint(endpoint);
}

function defaultChangelogPath(version: string): string {
  return join(projectRoot, "docs", "changelog", `${version}.md`);
}

function defaultChangelogRelPath(version: string): string {
  return `docs/changelog/${version}.md`;
}

type ResolvedNotes = {
  text: string;
  filePath?: string;
};

async function readNotesFile(filePath: string, displayPath: string): Promise<string> {
  if (!existsSync(filePath)) {
    throw new Error(`Notes file '${displayPath}' was not found.`);
  }
  const text = (await readFile(filePath, "utf8")).trim();
  if (!text) {
    throw new Error(`Notes file '${displayPath}' is empty.`);
  }
  return text;
}

async function resolveReleaseNotes(
  version: string,
  args: Pick<Args, "notes" | "notesFile">,
): Promise<ResolvedNotes> {
  if (args.notesFile && args.notes) {
    throw new Error("Use either --notes or --notes-file, not both.");
  }

  if (args.notesFile) {
    const filePath = resolve(projectRoot, args.notesFile);
    const text = await readNotesFile(filePath, args.notesFile);
    return { text, filePath };
  }

  if (args.notes) {
    return { text: args.notes };
  }

  const filePath = defaultChangelogPath(version);
  const displayPath = defaultChangelogRelPath(version);
  const text = await readNotesFile(filePath, displayPath);
  return { text, filePath };
}

async function githubTagExists(tag: string, repository: string): Promise<boolean> {
  const result = await $`gh api repos/${repository}/git/ref/tags/${tag}`.quiet().nothrow();
  if (result.exitCode === 0) return true;
  if (result.exitCode === 1) return false;
  throw new Error(`Failed to check GitHub tag '${tag}'. gh exited with code ${result.exitCode}.`);
}

async function githubReleaseExists(tag: string, repository: string): Promise<boolean> {
  const result = await $`gh release view ${tag} --repo ${repository}`.quiet().nothrow();
  if (result.exitCode === 0) return true;
  if (result.exitCode === 1) return false;
  throw new Error(
    `Failed to check GitHub release '${tag}'. gh exited with code ${result.exitCode}.`,
  );
}

async function writeLatestJson(options: {
  version: string;
  notes: string;
  installerName: string;
  signature: string;
  publicBase: string;
  tag: string;
  destination: string;
}): Promise<void> {
  const manifest = createUpdaterManifest({ ...options, downloadTag: options.tag });
  await writeFile(options.destination, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function publishToS3(options: {
  tag: string;
  assetPaths: string[];
  latestJsonPath: string;
  keyPrefix: string;
}): Promise<void> {
  const endpoint = requireEnv("S3_ENDPOINT");
  const accessKeyId = requireEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("S3_SECRET_ACCESS_KEY");
  const bucket = requireEnv("S3_BUCKET");
  const region = envOrDefault("S3_REGION", "auto");

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  // Serialize large streaming uploads to bound memory and bandwidth. Publish latest.json last.
  for (const assetPath of options.assetPaths) {
    const name = basename(assetPath);
    const key = joinS3Key(options.keyPrefix, options.tag, name);
    console.log(`Uploading ${name} to S3 (${key})...`);
    await new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: createReadStream(assetPath),
      },
    }).done();
  }

  const latestKey = joinS3Key(options.keyPrefix, "latest.json");
  console.log(`Uploading latest.json to S3 (${latestKey})...`);
  await new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: latestKey,
      Body: createReadStream(options.latestJsonPath),
      ContentType: "application/json",
      CacheControl: "no-cache",
    },
  }).done();
}

async function findInstaller(version: string) {
  const nsisDir = join(projectRoot, "src-tauri", "target", "release", "bundle", "nsis");
  if (!existsSync(nsisDir)) {
    throw new Error(
      `NSIS bundle directory not found at '${nsisDir}'. Run without --skip-build first.`,
    );
  }

  const installers = (await readdir(nsisDir)).filter(
    (name) => name.endsWith("-setup.exe") && !name.endsWith(".sig"),
  );
  const versionMarker = `_${version}_`;
  const installerName = installers.find((name) => name.includes(versionMarker));
  if (!installerName) {
    const found = installers.length > 0 ? ` Found: ${installers.join(", ")}.` : "";
    throw new Error(
      `No NSIS installer for version ${version} (*${versionMarker}*-setup.exe) found in '${nsisDir}'.${found}`,
    );
  }

  const installerSource = join(nsisDir, installerName);
  const signatureSource = `${installerSource}.sig`;
  if (!existsSync(signatureSource)) {
    throw new Error(
      `Signature file '${signatureSource}' was not found. Ensure createUpdaterArtifacts is enabled and the signing key is set.`,
    );
  }

  return { installerName, installerSource, signatureSource };
}

async function runGitHub(args: string[]): Promise<void> {
  const child = Bun.spawn(["gh", ...args], {
    cwd: projectRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(
      "GitHub publication failed: gh " + args.slice(0, 3).join(" ") + " (exit " + exitCode + ").",
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(Bun.argv.slice(2));

  assertCommand("git");
  assertCommand("gh");
  await assertReleasePrerequisites(args);

  const version = await getProjectVersion();
  const { tag, title: defaultTitle } = resolveReleaseIdentity(version, args.tag);
  const title = args.title ?? defaultTitle;

  $.cwd(projectRoot);

  const resolvedNotes = await resolveReleaseNotes(version, args);

  if (!args.allowDirty) {
    const status = (await $`git status --porcelain`.text()).trim();
    if (status) {
      throw new Error("Working tree is dirty. Commit or stash changes, or pass --allow-dirty.");
    }
  }

  if (!(await githubTagExists(tag, args.repository))) {
    throw new Error(
      `GitHub tag '${tag}' does not exist in '${args.repository}'. Create and push the current version tag before running this script.`,
    );
  }

  if (!args.skipBuild) {
    console.log("Building Tauri app...");
    await $`bun run tauri:build`;
  }

  const { installerName, installerSource, signatureSource } = await findInstaller(version);

  const releaseRoot = resolve(projectRoot, "artifacts", "release");
  const artifactRoot = resolve(releaseRoot, tag);
  if (!artifactRoot.startsWith(releaseRoot + sep)) {
    throw new Error("Release artifact directory is outside the expected output directory.");
  }
  await rm(artifactRoot, { recursive: true, force: true });
  await mkdir(artifactRoot, { recursive: true });

  const installerDest = join(artifactRoot, installerName);
  const signatureDest = join(artifactRoot, `${installerName}.sig`);
  const latestJsonDest = join(artifactRoot, "latest.json");

  console.log(`Copying ${installerName}...`);
  await copyFile(installerSource, installerDest);
  console.log(`Copying ${installerName}.sig...`);
  await copyFile(signatureSource, signatureDest);

  const publicBase = "https://github.com/" + args.repository + "/releases/download";
  const signature = await readFile(signatureDest, "utf8");
  console.log("Generating latest.json...");
  await writeLatestJson({
    version,
    notes: resolvedNotes.text,
    installerName,
    signature,
    publicBase,
    tag,
    destination: latestJsonDest,
  });

  const assetPaths = [installerDest, signatureDest, latestJsonDest];
  const exists = await githubReleaseExists(tag, args.repository);
  await publishRelease(
    {
      repository: args.repository,
      tag,
      title,
      notes: resolvedNotes.text,
      notesFile: resolvedNotes.filePath,
      assetPaths,
      exists,
      draft: args.draft,
      prerelease: args.prerelease,
      clobber: args.clobber,
    },
    runGitHub,
    async () => {
      if (args.skipS3) return;
      const mirrorBase = await getPublicReleaseBase();
      const mirrorDir = join(artifactRoot, "s3");
      await mkdir(mirrorDir, { recursive: true });
      const mirrorManifest = join(mirrorDir, "latest.json");
      await writeLatestJson({
        version,
        notes: resolvedNotes.text,
        installerName,
        signature,
        publicBase: mirrorBase,
        tag,
        destination: mirrorManifest,
      });
      await publishToS3({
        tag,
        assetPaths: [installerDest, signatureDest],
        latestJsonPath: mirrorManifest,
        keyPrefix: s3KeyPrefixFromPublicBase(mirrorBase),
      });
    },
  );

  console.log(`Release assets are in ${artifactRoot}`);
}

await main();
