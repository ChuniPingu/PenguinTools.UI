import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fingerprintDirectory, fingerprintFiles } from "./file-fingerprint";
import { assertRuntimePayload } from "./runtime-payload";
import { resolveBuildTool } from "./build-tools";

const gitExecutable = resolveBuildTool("git");

function sourceFiles(root: string): string[] {
  const files = execFileSync(
    gitExecutable,
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      ".",
      ":(exclude).tmp/**",
      ":(exclude).tmp-*/**",
      ":(exclude).codex/**",
    ],
    { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return files
    .split("\0")
    .filter(Boolean)
    .flatMap((file) => {
      const path = join(root, file);
      if (existsSync(path) && statSync(path).isDirectory()) {
        // Git lists submodules as directories; hash their working trees too.
        return sourceFiles(path).map((child) => join(file, child));
      }
      return [file];
    });
}

export async function fingerprintPublishInputs(
  projectRoot: string,
  profile: string,
): Promise<string> {
  const backendRoot = join(projectRoot, "external", "PenguinTools");
  const files = sourceFiles(backendRoot).map((file) =>
    relative(projectRoot, join(backendRoot, file)),
  );
  files.push(
    "scripts/build-cli.ts",
    "scripts/build-tools.ts",
    "scripts/publish-cache.ts",
    "scripts/file-fingerprint.ts",
    "scripts/publish-profile.ts",
    "scripts/runtime-payload.ts",
  );
  const sdk = execFileSync(resolveBuildTool("dotnet"), ["--info"], {
    cwd: backendRoot,
    encoding: "utf8",
  });
  const environment = Object.entries(process.env)
    .filter(
      ([key]) =>
        /^(DOTNET_|MSBUILD|NUGET_|VCTOOLS|WINDOWSSDK|UCRT|UNIVERSALCRT)/i.test(key) ||
        /^(LIB|LIBPATH|INCLUDE|CL|_CL_|LINK|_LINK_)$/i.test(key),
    )
    // Shells and task runners prepend temporary entries to PATH. SDK resolution
    // is already captured by dotnet --info; those entries are not build inputs.
    .map(([key, value]) => [key.toUpperCase(), value] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  return createHash("sha256")
    .update(
      JSON.stringify({
        profile,
        sdk,
        environment,
        files: await fingerprintFiles(projectRoot, files),
      }),
    )
    .digest("hex");
}

interface PublishCacheOptions {
  cacheFile: string;
  publishRoot: string;
  nativeToolsRoot: string;
  force?: boolean;
  fingerprint: () => Promise<string>;
  publish: () => Promise<void>;
}

export async function publishWithCache(options: PublishCacheOptions): Promise<boolean> {
  const { cacheFile, publishRoot, nativeToolsRoot, fingerprint, publish } = options;
  const input = await fingerprint();
  if (!options.force) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, "utf8"));
      if (
        cached.version === 1 &&
        cached.input === input &&
        cached.nativeTools === (await fingerprintDirectory(nativeToolsRoot))
      ) {
        assertRuntimePayload(publishRoot);
        if (cached.output === (await fingerprintDirectory(publishRoot))) return false;
      }
    } catch {
      // Missing/corrupt cache records or outputs require a fresh publish.
    }
  }

  // A failed or interrupted publish must never leave a reusable success record.
  await rm(cacheFile, { force: true });
  await publish();
  assertRuntimePayload(publishRoot);
  if (input === (await fingerprint())) {
    const record = {
      version: 1,
      input,
      // Publishing can download native tools on the first build.
      nativeTools: await fingerprintDirectory(nativeToolsRoot),
      output: await fingerprintDirectory(publishRoot),
    };
    await mkdir(dirname(cacheFile), { recursive: true });
    const temporaryFile = `${cacheFile}.${process.pid}.tmp`;
    await writeFile(temporaryFile, JSON.stringify(record));
    await rename(temporaryFile, cacheFile);
  }
  return true;
}
