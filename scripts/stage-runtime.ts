import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { $ } from "bun";
import { forwardProfileArgs, resolvePublishProfile } from "./publish-profile";
import { stageRuntimePayload } from "./runtime-payload";

const skipPublish = process.argv.includes("--skip-publish");
const force = process.argv.includes("--force");
if (skipPublish && force) {
  throw new Error("--force cannot be combined with --skip-publish.");
}
const { alias, profile: publishProfile } = resolvePublishProfile();
const profileArgs = forwardProfileArgs();
if (force) profileArgs.push("--force");
const projectRoot = resolve(import.meta.dir, "..");
const publishRoot = join(
  projectRoot,
  "external",
  "PenguinTools",
  "PenguinTools.CLI",
  "bin",
  "Release",
  "net11.0",
  "publish",
  publishProfile,
);
const stageRoot = join(projectRoot, "src-tauri", "resources", "runtime");

function getDirSizeBytes(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirSizeBytes(path);
    } else if (entry.isFile()) {
      total += statSync(path).size;
    }
  }
  return total;
}

if (!skipPublish) {
  await $`bun ${join(projectRoot, "scripts", "build-cli.ts")} ${profileArgs}`;
} else {
  console.log(
    `Skipping PenguinTools publish (--skip-publish). Using profile ${alias} (${publishProfile}).`,
  );
}

const staged = await stageRuntimePayload(publishRoot, stageRoot);

const totalMb = Math.round((getDirSizeBytes(stageRoot) / (1024 * 1024)) * 100) / 100;
console.log(
  staged
    ? `Staged ${alias} runtime payload to ${stageRoot}: ${totalMb} MB`
    : `Reusing staged ${alias} runtime payload (unchanged): ${totalMb} MB`,
);
if (totalMb > 100) {
  console.warn(`Runtime payload exceeds 100 MB (${totalMb} MB).`);
}
