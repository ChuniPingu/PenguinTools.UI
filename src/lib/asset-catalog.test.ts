import { describe, expect, it } from "vite-plus/test";
import { mergeAssetCatalogs } from "@/lib/asset-catalog";

describe("mergeAssetCatalogs", () => {
  it("unions hard and user entries by id with user winning conflicts", () => {
    const merged = mergeAssetCatalogs(
      {
        genreNames: [{ id: 1, str: "Hard" }],
        notesFieldLine: [{ id: 0, str: "Orange", data: "オレンジ" }],
        stageName: [{ id: 8, str: "Stock" }],
        worldsEndTagName: [],
      },
      {
        genreNames: [
          { id: 1, str: "UserWins" },
          { id: 2, str: "Extra" },
        ],
        notesFieldLine: [],
        stageName: [{ id: 9, str: "Custom" }],
        worldsEndTagName: [{ id: 3, str: "WE" }],
      },
    );

    expect(merged.genreNames).toEqual([
      { id: 1, name: "UserWins", data: null },
      { id: 2, name: "Extra", data: null },
    ]);
    expect(merged.fieldLines).toEqual([{ id: 0, name: "Orange", data: "オレンジ" }]);
    expect(merged.stageNames.map((e) => e.id)).toEqual([8, 9]);
    expect(merged.weTagNames).toEqual([{ id: 3, name: "WE", data: null }]);
  });

  it("uses hard assets only when user is null", () => {
    const merged = mergeAssetCatalogs(
      {
        genreNames: [{ id: 1000, str: "自制譜" }],
        notesFieldLine: [],
        stageName: [],
        worldsEndTagName: [],
      },
      null,
    );
    expect(merged.genreNames).toEqual([{ id: 1000, name: "自制譜", data: null }]);
    expect(merged.fieldLines).toEqual([]);
  });
});
