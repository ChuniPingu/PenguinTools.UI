import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { assertRuntimePayload, stageRuntimePayload } from "./runtime-payload";

const temporaryRoots: string[] = [];

function fixture(): { publishRoot: string; stageRoot: string } {
  const root = mkdtempSync(join(tmpdir(), "penguin-runtime-"));
  temporaryRoots.push(root);
  const publishRoot = join(root, "publish");
  // Match the upstream publish layout independently of the validator's list.
  for (const relativePath of [
    "PenguinTools.CLI.exe",
    "assets/texconv/texconv.exe",
    "assets/ffmpeg/ffmpeg.exe",
    "assets/image-tools/image-tools.exe",
    "assets/image-tools/libvips-42.dll",
  ]) {
    const path = join(publishRoot, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    const size = relativePath.endsWith("image-tools.exe")
      ? 277504
      : relativePath.endsWith("texconv.exe")
        ? 966480
        : 1024 * 1024;
    const binary = Buffer.alloc(size);
    binary.write("MZ");
    writeFileSync(path, binary);
  }
  return { publishRoot, stageRoot: join(root, "stage") };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("CLI runtime payload", () => {
  it("reuses identical staged files without changing their timestamps", async () => {
    const { publishRoot, stageRoot } = fixture();
    expect(await stageRuntimePayload(publishRoot, stageRoot)).toBe(true);
    const file = join(stageRoot, "PenguinTools.CLI.exe");
    utimesSync(file, new Date(0), new Date(0));
    const timestamp = statSync(file).mtimeMs;
    expect(await stageRuntimePayload(publishRoot, stageRoot)).toBe(false);
    expect(statSync(file).mtimeMs).toBe(timestamp);
  });

  it.each(["missing", "corrupt", "extra"])("repairs %s staged files", async (change) => {
    const { publishRoot, stageRoot } = fixture();
    await stageRuntimePayload(publishRoot, stageRoot);
    const file = join(stageRoot, "PenguinTools.CLI.exe");
    if (change === "missing") rmSync(file);
    else if (change === "corrupt") writeFileSync(file, "broken");
    else writeFileSync(join(stageRoot, "obsolete.dll"), "extra");
    expect(await stageRuntimePayload(publishRoot, stageRoot)).toBe(true);
    expect(readFileSync(file)).toEqual(readFileSync(join(publishRoot, "PenguinTools.CLI.exe")));
    expect(existsSync(join(stageRoot, "obsolete.dll"))).toBe(false);
  });

  it("stages native DLLs, framework-dependent files, and license notices", async () => {
    const { publishRoot, stageRoot } = fixture();
    const extraFiles = [
      "PenguinTools.CLI.dll",
      "PenguinTools.CLI.deps.json",
      "PenguinTools.CLI.runtimeconfig.json",
      "assets/image-tools/build-metadata.json",
      "assets/image-tools/licenses/dependencies/mozjpeg/LICENSE.md",
      "assets/ffmpeg/legal/NOTICE.md",
    ];
    for (const relativePath of extraFiles) {
      const path = join(publishRoot, relativePath);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, relativePath);
    }
    mkdirSync(stageRoot);
    writeFileSync(join(stageRoot, "obsolete-tool.exe"), "obsolete");

    await stageRuntimePayload(publishRoot, stageRoot);

    for (const relativePath of extraFiles) {
      expect(readFileSync(join(stageRoot, relativePath), "utf8")).toBe(relativePath);
    }
    expect(existsSync(join(stageRoot, "obsolete-tool.exe"))).toBe(false);
    expect(existsSync(join(stageRoot, "assets/mua"))).toBe(false);
    expect(existsSync(join(stageRoot, "assets/cri"))).toBe(false);
  });

  it.each([
    "assets/texconv/texconv.exe",
    "assets/image-tools/image-tools.exe",
    "assets/image-tools/libvips-42.dll",
  ])("keeps the staged runtime when %s is missing", async (relativePath) => {
    const { publishRoot, stageRoot } = fixture();
    rmSync(join(publishRoot, relativePath));
    mkdirSync(stageRoot);
    writeFileSync(join(stageRoot, "existing.txt"), "keep");

    await expect(stageRuntimePayload(publishRoot, stageRoot)).rejects.toThrow(relativePath);
    expect(readFileSync(join(stageRoot, "existing.txt"), "utf8")).toBe("keep");
  });

  it("rejects stub binaries and non-PE native libraries", () => {
    const { publishRoot } = fixture();
    const texconv = join(publishRoot, "assets/texconv/texconv.exe");
    writeFileSync(texconv, "stub");
    expect(() => assertRuntimePayload(publishRoot)).toThrow("looks invalid");
    const bytes = Buffer.alloc(966480);
    bytes.write("MZ");
    writeFileSync(texconv, bytes);
    writeFileSync(
      join(publishRoot, "assets/image-tools/libvips-42.dll"),
      Buffer.alloc(1024 * 1024),
    );
    expect(() => assertRuntimePayload(publishRoot)).toThrow("not a valid Windows PE binary");
  });
});
