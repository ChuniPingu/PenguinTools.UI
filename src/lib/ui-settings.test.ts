import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { pathExists, readTextFile, writeTextFile } from "@/lib/app-fs";
import { saveUiSettings } from "@/lib/ui-settings";

vi.mock("@/lib/app-fs", () => ({
  pathExists: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

describe("saveUiSettings", () => {
  let contents: string;

  beforeEach(() => {
    vi.resetAllMocks();
    contents = JSON.stringify({
      gameDirectory: "C:/game",
      theme: "system",
      language: "en",
      autoUpdate: true,
    });
    vi.mocked(pathExists).mockResolvedValue(true);
    vi.mocked(readTextFile).mockImplementation(async () => contents);
    vi.mocked(writeTextFile).mockImplementation(async (_path, value) => {
      contents = value;
    });
  });

  it("retains patches from overlapping controls", async () => {
    await Promise.all([
      saveUiSettings("C:/data", { theme: "dark" }),
      saveUiSettings("C:/data", { language: "zh-Hans" }),
      saveUiSettings("C:/data", { autoUpdate: false }),
    ]);
    expect(JSON.parse(contents)).toEqual({
      gameDirectory: "C:/game",
      theme: "dark",
      language: "zh-Hans",
      autoUpdate: false,
    });
  });

  it("reports a failed save and still processes the next patch", async () => {
    const failure = new Error("Write failed");
    vi.mocked(writeTextFile).mockRejectedValueOnce(failure);
    const failedSave = saveUiSettings("C:/data", { theme: "dark" });
    const nextSave = saveUiSettings("C:/data", { language: "zh-Hans" });
    await expect(failedSave).rejects.toBe(failure);
    await nextSave;
    expect(JSON.parse(contents)).toMatchObject({ theme: "system", language: "zh-Hans" });
  });

  it.each(["{broken", "null", "[]"])("does not overwrite invalid settings: %s", async (raw) => {
    contents = raw;
    await expect(saveUiSettings("C:/data", { theme: "dark" })).rejects.toThrow();
    expect(writeTextFile).not.toHaveBeenCalled();
    expect(contents).toBe(raw);
  });

  it("does not write defaults when reading existing settings fails", async () => {
    const error = new Error("Read failed");
    vi.mocked(readTextFile).mockRejectedValueOnce(error);
    await expect(saveUiSettings("C:/data", { theme: "dark" })).rejects.toBe(error);
    expect(writeTextFile).not.toHaveBeenCalled();
  });

  it("preserves fields added by another version", async () => {
    contents = JSON.stringify({ ...JSON.parse(contents), futurePreference: "keep" });
    await saveUiSettings("C:/data", { theme: "dark" });
    expect(JSON.parse(contents)).toMatchObject({ theme: "dark", futurePreference: "keep" });
  });
});
