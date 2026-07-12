import { closeSync, openSync, readSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { $ } from "bun";

const skipPublish = process.argv.includes("--skip-publish");

const projectRoot = resolve(import.meta.dir, "..");
const penguinToolsRoot = join(projectRoot, "external", "PenguinTools");
const publishRoot = join(
  penguinToolsRoot,
  "PenguinTools.CLI",
  "bin",
  "Release",
  "net10.0",
  "publish",
  "WinX64-SelfContained-SingleFile",
);
const cliExe = join(publishRoot, "PenguinTools.CLI.exe");
const assetsRoot = join(publishRoot, "assets");
const muaAssetsRoot = join(assetsRoot, "mua");
const stageRoot = join(projectRoot, "src-tauri", "resources", "runtime");
const requiredMuaBinaries = ["mua_wav.exe", "mua_img.exe", "mua_cri.exe"];
const MIN_MUA_BYTES = 1024 * 1024;

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

function assertPeExecutable(path: string, label: string): void {
  const fd = openSync(path, "r");
  try {
    const header = Buffer.alloc(2);
    readSync(fd, header, 0, 2, 0);
    if (header[0] !== 0x4d || header[1] !== 0x5a) {
      throw new Error(`${label} at '${path}' is not a valid Windows executable.`);
    }
  } finally {
    closeSync(fd);
  }
}

function assertMuaBinary(path: string, name: string): void {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`CLI mua asset '${name}' was not found at '${path}'.`);
  }

  const size = statSync(path).size;
  if (size < MIN_MUA_BYTES) {
    throw new Error(
      `CLI mua asset '${name}' looks invalid (${size} bytes) at '${path}'.\n\nRun:\n  bun run build:cli`,
    );
  }

  assertPeExecutable(path, `CLI mua asset '${name}'`);
}

function assertRuntimeAssets(): void {
  if (!existsSync(assetsRoot) || !statSync(assetsRoot).isDirectory()) {
    throw new Error(`CLI assets folder was not found at '${assetsRoot}'.`);
  }

  if (!existsSync(muaAssetsRoot) || !statSync(muaAssetsRoot).isDirectory()) {
    throw new Error(
      `CLI mua assets were not found at '${muaAssetsRoot}'.\n\nRun:\n  bun run build:cli`,
    );
  }

  for (const binary of requiredMuaBinaries) {
    assertMuaBinary(join(muaAssetsRoot, binary), binary);
  }
}

if (!skipPublish) {
  await $`bun ${join(projectRoot, "scripts", "build-cli.ts")}`;
} else {
  console.log("Skipping PenguinTools publish (--skip-publish).");
}

if (!existsSync(cliExe) || !statSync(cliExe).isFile()) {
  throw new Error(`CLI executable was not found at '${cliExe}'.\n\nRun:\n  bun run build:cli`);
}

assertPeExecutable(cliExe, "CLI executable");
assertRuntimeAssets();

if (existsSync(stageRoot)) {
  await rm(stageRoot, { recursive: true, force: true });
}
await mkdir(stageRoot, { recursive: true });

console.log(`Staging runtime payload to ${stageRoot}`);
await cp(cliExe, join(stageRoot, "PenguinTools.CLI.exe"));
await cp(assetsRoot, join(stageRoot, "assets"), { recursive: true });

for (const binary of requiredMuaBinaries) {
  assertMuaBinary(join(stageRoot, "assets", "mua", binary), binary);
}

const totalMb = Math.round((getDirSizeBytes(stageRoot) / (1024 * 1024)) * 100) / 100;
console.log(`Staged runtime payload: ${totalMb} MB`);

if (totalMb > 100) {
  console.warn(`Runtime payload exceeds 100 MB (${totalMb} MB).`);
}
