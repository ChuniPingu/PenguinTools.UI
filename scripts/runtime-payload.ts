import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fingerprintDirectory } from "./file-fingerprint";

export const REQUIRED_RUNTIME_BINARIES = [
  "assets/texconv/texconv.exe",
  "assets/ffmpeg/ffmpeg.exe",
  "assets/image-tools/image-tools.exe",
  "assets/image-tools/libvips-42.dll",
] as const;
const MIN_TOOL_BYTES = 1024 * 1024;

function assertPeBinary(path: string): void {
  const fd = openSync(path, "r");
  try {
    const header = Buffer.alloc(2);
    readSync(fd, header, 0, 2, 0);
    if (header[0] !== 0x4d || header[1] !== 0x5a) {
      throw new Error(`Runtime binary at '${path}' is not a valid Windows PE binary.`);
    }
  } finally {
    closeSync(fd);
  }
}

export function assertRuntimePayload(root: string): void {
  for (const relativePath of ["PenguinTools.CLI.exe", ...REQUIRED_RUNTIME_BINARIES]) {
    const path = join(root, relativePath);
    if (!existsSync(path) || !statSync(path).isFile()) {
      throw new Error(
        `Runtime binary '${relativePath}' was not found at '${path}'. Run 'vp run build:cli'.`,
      );
    }
    const minimumBytes = relativePath.endsWith("image-tools.exe")
      ? MIN_TOOL_BYTES / 8
      : relativePath.endsWith("texconv.exe")
        ? MIN_TOOL_BYTES / 2
        : MIN_TOOL_BYTES;
    if (relativePath !== "PenguinTools.CLI.exe" && statSync(path).size < minimumBytes) {
      throw new Error(`Runtime binary '${relativePath}' looks invalid. Run 'vp run build:cli'.`);
    }
    assertPeBinary(path);
  }
}

export async function stageRuntimePayload(
  publishRoot: string,
  stageRoot: string,
): Promise<boolean> {
  // Validate before replacing the existing staged runtime.
  assertRuntimePayload(publishRoot);
  if (
    existsSync(stageRoot) &&
    (await fingerprintDirectory(publishRoot)) === (await fingerprintDirectory(stageRoot))
  ) {
    return false;
  }
  await rm(stageRoot, { recursive: true, force: true });
  await mkdir(stageRoot, { recursive: true });
  // Include native DLLs, managed FDD dependencies, runtime configuration, and notices.
  await cp(publishRoot, stageRoot, { recursive: true });
  assertRuntimePayload(stageRoot);
  return true;
}
