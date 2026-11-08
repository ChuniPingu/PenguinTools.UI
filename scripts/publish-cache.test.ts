import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { publishWithCache } from "./publish-cache";

const roots: string[] = [];

function write(root: string, file: string, content: string | Buffer): void {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "penguin-publish-cache-"));
  roots.push(root);
  const publishRoot = join(root, "publish");
  const nativeToolsRoot = join(root, "native-tools");
  const publish = vi.fn(async () => {
    for (const file of [
      "PenguinTools.CLI.exe",
      "assets/texconv/texconv.exe",
      "assets/ffmpeg/ffmpeg.exe",
      "assets/image-tools/image-tools.exe",
      "assets/image-tools/libvips-42.dll",
    ]) {
      const bytes = Buffer.alloc(file.endsWith("image-tools.exe") ? 277504 : 1024 * 1024);
      bytes.write("MZ");
      write(publishRoot, file, bytes);
    }
    write(publishRoot, "PenguinTools.CLI.runtimeconfig.json", "config");
    // Native tools may only become available during the first publish.
    write(nativeToolsRoot, "ffmpeg.exe", "downloaded");
  });
  return {
    cacheFile: join(root, "cache", "aot.json"),
    publishRoot,
    nativeToolsRoot,
    fingerprint: vi.fn(async () => "source-and-sdk-v1"),
    publish,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("publish cache", () => {
  it("publishes once and reuses identical validated output", async () => {
    const options = fixture();
    expect(await publishWithCache(options)).toBe(true);
    expect(await publishWithCache(options)).toBe(false);
    expect(options.publish).toHaveBeenCalledTimes(1);
  });

  it("rebuilds when inputs change or publishing is forced", async () => {
    const options = fixture();
    await publishWithCache(options);
    options.fingerprint.mockResolvedValue("source-and-sdk-v2");
    expect(await publishWithCache(options)).toBe(true);
    expect(await publishWithCache(options)).toBe(false);
    expect(await publishWithCache({ ...options, force: true })).toBe(true);
    expect(options.publish).toHaveBeenCalledTimes(3);
  });

  it("keeps profiles independent", async () => {
    const aot = fixture();
    const fdd = fixture();
    await publishWithCache(aot);
    await publishWithCache(fdd);
    expect(await publishWithCache(aot)).toBe(false);
    expect(await publishWithCache(fdd)).toBe(false);
    expect(aot.publish).toHaveBeenCalledTimes(1);
    expect(fdd.publish).toHaveBeenCalledTimes(1);
  });

  it.each(["missing", "corrupt", "extra"])("rebuilds after %s output", async (change) => {
    const options = fixture();
    await publishWithCache(options);
    const file = join(options.publishRoot, "PenguinTools.CLI.runtimeconfig.json");
    if (change === "missing") rmSync(file);
    else if (change === "corrupt") writeFileSync(file, "broken");
    else write(options.publishRoot, "obsolete.dll", "extra");
    expect(await publishWithCache(options)).toBe(true);
  });

  it("rebuilds when downloaded native tools change", async () => {
    const options = fixture();
    await publishWithCache(options);
    write(options.nativeToolsRoot, "ffmpeg.exe", "replacement");
    expect(await publishWithCache(options)).toBe(true);
  });

  it("rebuilds with an unreadable cache record", async () => {
    const options = fixture();
    await publishWithCache(options);
    writeFileSync(options.cacheFile, "{partial");
    expect(await publishWithCache(options)).toBe(true);
  });

  it("invalidates the old success record before a failed forced publish", async () => {
    const options = fixture();
    await publishWithCache(options);
    options.publish.mockRejectedValueOnce(new Error("publish failed"));
    await expect(publishWithCache({ ...options, force: true })).rejects.toThrow("publish failed");
    expect(await publishWithCache(options)).toBe(true);
    expect(options.publish).toHaveBeenCalledTimes(3);
  });

  it("does not cache a publish if sources change while it is running", async () => {
    const options = fixture();
    options.fingerprint.mockResolvedValueOnce("before").mockResolvedValue("after");
    await publishWithCache(options);
    expect(await publishWithCache(options)).toBe(true);
    expect(await publishWithCache(options)).toBe(false);
  });

  it("rejects invalid published binaries instead of recording success", async () => {
    const options = fixture();
    const publish = options.publish.getMockImplementation()!;
    options.publish.mockImplementationOnce(async () => {
      await publish();
      const file = join(options.publishRoot, "PenguinTools.CLI.exe");
      const bytes = readFileSync(file);
      bytes.write("XX");
      writeFileSync(file, bytes);
    });
    await expect(publishWithCache(options)).rejects.toThrow("not a valid Windows PE binary");
    expect(await publishWithCache(options)).toBe(true);
  });
});
