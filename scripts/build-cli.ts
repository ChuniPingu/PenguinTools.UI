import { $ } from "bun";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { resolvePublishProfile } from "./publish-profile";
import { fingerprintPublishInputs, publishWithCache } from "./publish-cache";

const projectRoot = resolve(import.meta.dir, "..");
const penguinToolsRoot = join(projectRoot, "external", "PenguinTools");
const { alias, profile: publishProfile } = resolvePublishProfile();
const publishRoot = join(
  penguinToolsRoot,
  "PenguinTools.CLI",
  "bin",
  "Release",
  "net10.0",
  "publish",
  publishProfile,
);

for (const relativeRoot of ["", "External/SonicAudioTools", "External/vgaudio"]) {
  const root = join(penguinToolsRoot, relativeRoot);
  if (!existsSync(join(root, ".git"))) {
    throw new Error(`Submodule is missing at '${root}'. Run 'vp run setup' first.`);
  }
}

const published = await publishWithCache({
  cacheFile: join(projectRoot, ".tmp", "runtime-cache", `${publishProfile}.json`),
  publishRoot,
  nativeToolsRoot: join(penguinToolsRoot, "artifacts", "tools"),
  force: process.argv.includes("--force"),
  fingerprint: () => fingerprintPublishInputs(projectRoot, publishProfile),
  publish: async () => {
    console.log(`Publishing PenguinTools with profile ${alias} (${publishProfile})...`);
    // dotnet publish retains old files; start clean so removed tools cannot be bundled.
    await rm(publishRoot, { recursive: true, force: true });
    await $`dotnet publish PenguinTools.CLI/PenguinTools.CLI.csproj -p:PublishProfile=${publishProfile} /p:DebugType=None /p:DebugSymbols=false`.cwd(
      penguinToolsRoot,
    );
  },
});
console.log(
  published
    ? `PenguinTools publish ready at ${publishRoot}`
    : `Reusing ${alias} PenguinTools publish. Use --force to rebuild.`,
);
