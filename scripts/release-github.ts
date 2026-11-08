export type ReleaseIdentity = {
  tag: string;
  title: string;
};

export function resolveReleaseIdentity(
  uiVersion: string,
  requestedUiTag?: string,
): ReleaseIdentity {
  if (!/^\d+\.\d+\.\d+$/.test(uiVersion)) {
    throw new Error("UI version must look like X.Y.Z.");
  }

  const uiTag = "v" + uiVersion;
  if (requestedUiTag && requestedUiTag !== uiTag) {
    throw new Error("UI release tag must match " + uiTag + ".");
  }

  return {
    tag: uiTag,
    title: "PenguinTools.UI v" + uiVersion,
  };
}

export function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") {
    end--;
  }
  return value.slice(0, end);
}

export function createUpdaterManifest(options: {
  version: string;
  notes: string;
  installerName: string;
  signature: string;
  publicBase: string;
  downloadTag: string;
}) {
  const publicBase = trimTrailingSlashes(options.publicBase);

  return {
    version: options.version,
    notes: options.notes,
    pub_date: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    platforms: {
      "windows-x86_64": {
        signature: options.signature.trim(),
        url:
          publicBase +
          "/" +
          encodeURIComponent(options.downloadTag) +
          "/" +
          encodeURIComponent(options.installerName),
      },
    },
  };
}

type RunGitHub = (args: string[]) => Promise<void>;

export async function publishRelease(
  options: {
    repository: string;
    tag: string;
    title: string;
    notes: string;
    notesFile?: string;
    assetPaths: string[];
    exists: boolean;
    draft: boolean;
    prerelease: boolean;
    clobber: boolean;
  },
  run: RunGitHub,
  publishMirror?: () => Promise<void>,
): Promise<void> {
  const notesArgs = options.notesFile
    ? ["--notes-file", options.notesFile]
    : ["--notes", options.notes];

  if (options.exists) {
    const uploadArgs = [
      "release",
      "upload",
      options.tag,
      ...options.assetPaths,
      "--repo",
      options.repository,
    ];
    if (options.clobber) {
      uploadArgs.push("--clobber");
    }

    await run(uploadArgs);
  } else {
    // Stage all assets before making a new release discoverable.
    await run([
      "release",
      "create",
      options.tag,
      ...options.assetPaths,
      "--repo",
      options.repository,
      "--title",
      options.title,
      "--verify-tag",
      "--draft",
      `--prerelease=${options.prerelease}`,
      ...notesArgs,
    ]);
  }

  if (!options.draft && !options.prerelease) {
    await publishMirror?.();
  }

  await run([
    "release",
    "edit",
    options.tag,
    "--repo",
    options.repository,
    "--title",
    options.title,
    `--draft=${options.draft}`,
    `--prerelease=${options.prerelease}`,
    ...notesArgs,
  ]);
}
