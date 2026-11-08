import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { loadAssetCatalog, mergeAssetCatalogs } from "@/lib/asset-catalog";
import { pathExists, readTextFile } from "@/lib/app-fs";

vi.mock("@/lib/app-fs", () => ({ pathExists: vi.fn(), readTextFile: vi.fn() }));

describe("loadAssetCatalog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(pathExists).mockResolvedValue(true);
    vi.mocked(readTextFile).mockResolvedValueOnce('{"genreNames":[{"id":1,"str":"Built in"}]}');
  });

  it.each(["{bad json", "null", '{"genreNames":{}}', '{"genreNames":[null]}'])(
    "reports invalid user assets and retains built-in entries: %s",
    async (json) => {
      vi.mocked(readTextFile).mockResolvedValueOnce(json);
      const { catalog, errors } = await loadAssetCatalog("C:/assets", "C:/data");
      expect(catalog.hasUserAssets).toBe(false);
      expect(catalog.genreNames).toEqual([{ id: 1, name: "Built in", data: null }]);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("assets.user.json");
    },
  );

  it("accepts missing optional assets without an error", async () => {
    vi.mocked(pathExists).mockResolvedValue(false);
    const { catalog, errors } = await loadAssetCatalog("C:/assets", "C:/data");
    expect(catalog.hasUserAssets).toBe(false);
    expect(errors).toEqual([]);
    expect(readTextFile).toHaveBeenCalledOnce();
  });

  it("retains user assets and reports the cause when built-in assets cannot be read", async () => {
    vi.mocked(readTextFile)
      .mockReset()
      .mockRejectedValueOnce(new Error("Access denied"))
      .mockResolvedValueOnce('{"genreNames":[{"id":2,"str":"User"}]}');
    const { catalog, errors } = await loadAssetCatalog("C:/assets", "C:/data");
    expect(catalog.hasUserAssets).toBe(true);
    expect(catalog.genreNames).toEqual([{ id: 2, name: "User", data: null }]);
    expect(errors[0]).toContain("Access denied");
  });
});

describe("mergeAssetCatalogs", () => {
  it("unions hard and user entries by id with user winning conflicts", () => {
    const merged = mergeAssetCatalogs(
      {
        genreNames: [{ id: 1, str: "Hard" }],
        notesFieldLine: [{ id: 0, str: "Orange", data: "オレンジ" }],
        stageName: [{ id: 8, str: "Stock" }],
        worldsEndTagName: [],
        releaseTagName: [{ id: 0, str: "CHUNITHM", data: "v1 1.00.00" }],
      },
      {
        genreNames: [
          { id: 1, str: "UserWins" },
          { id: 2, str: "Extra" },
        ],
        notesFieldLine: [],
        stageName: [{ id: 9, str: "Custom" }],
        worldsEndTagName: [{ id: 3, str: "WE" }],
        releaseTagName: [{ id: 21, str: "CHUNITHM Mate", data: "v2 2.50.00" }],
      },
    );

    expect(merged.genreNames).toEqual([
      { id: 1, name: "UserWins", data: null },
      { id: 2, name: "Extra", data: null },
    ]);
    expect(merged.fieldLines).toEqual([{ id: 0, name: "Orange", data: "オレンジ" }]);
    expect(merged.stageNames.map((e) => e.id)).toEqual([8, 9]);
    expect(merged.weTagNames).toEqual([{ id: 3, name: "WE", data: null }]);
    expect(merged.releaseTagNames).toEqual([
      { id: 0, name: "CHUNITHM", data: "v1 1.00.00" },
      { id: 21, name: "CHUNITHM Mate", data: "v2 2.50.00" },
    ]);
  });

  it("uses hard assets only when user is null", () => {
    const merged = mergeAssetCatalogs(
      {
        genreNames: [{ id: 1000, str: "自制譜" }],
        notesFieldLine: [],
        stageName: [],
        worldsEndTagName: [],
        releaseTagName: [{ id: 0, str: "CHUNITHM", data: "v1 1.00.00" }],
      },
      null,
    );
    expect(merged.genreNames).toEqual([{ id: 1000, name: "自制譜", data: null }]);
    expect(merged.fieldLines).toEqual([]);
    expect(merged.releaseTagNames).toEqual([{ id: 0, name: "CHUNITHM", data: "v1 1.00.00" }]);
  });
});
