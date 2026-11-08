import { describe, expect, it } from "vite-plus/test";
import type { OptionScanBook } from "@/lib/cli-results";
import { applyMainDifficultyToBook, collectMainDifficultyOverrides } from "@/lib/option-book";

const sampleBook: OptionScanBook = {
  songId: 1001,
  title: "Song",
  artist: "Artist",
  mainDifficulty: "Master",
  sortName: "master-sort",
  genre: { id: 1, name: "Genre" },
  unlockEventId: null,
  releaseDate: "2026-01-01",
  isCustomStage: false,
  stageId: null,
  bgiFilePath: "",
  notesFieldLine: { id: 0, name: "" },
  stage: { id: 0, name: "" },
  weTag: { id: 0, name: "" },
  weDifficultyId: 0,
  weDifficulty: "N/A",
  jacketFilePath: "jacket.png",
  bgmFilePath: "audio.wav",
  bgmPreviewStart: 0,
  bgmPreviewStop: 30,
  bgmManualOffset: 0,
  bgmRealOffset: 0,
  bgmEnableBarOffset: false,
  bgmInitialBpm: 120,
  bgmInitialNumerator: 4,
  bgmInitialDenominator: 4,
  charts: [
    {
      difficulty: "Master",
      mgxcId: "1001",
      songId: 1001,
      title: "Song",
      artist: "Artist",
      designer: "A",
      level: 13,
      mainBpm: 180,
      mainTil: 10,
      filePath: "a.mgxc",
      isMain: true,
      sortName: "master-sort",
      genre: { id: 1, name: "Genre" },
      weTag: { id: 0, name: "" },
      weDifficultyId: 0,
      weDifficulty: "",
      unlockEventId: null,
      releaseDate: "2026-01-01",
      jacketFilePath: "jacket.png",
      bgmFilePath: "audio.wav",
      bgmPreviewStart: 0,
      bgmPreviewStop: 30,
      bgmManualOffset: 0,
      bgmRealOffset: 0,
      bgmEnableBarOffset: false,
      bgmInitialBpm: 120,
      bgmInitialNumerator: 4,
      bgmInitialDenominator: 4,
      isCustomStage: false,
      stageId: null,
      bgiFilePath: "",
      notesFieldLine: { id: 0, name: "" },
      stage: { id: 0, name: "" },
      diagnostics: [],
    },
    {
      difficulty: "WorldsEnd",
      mgxcId: "1001",
      songId: 1001,
      title: "Song",
      artist: "Artist",
      designer: "B",
      level: 0,
      mainBpm: 200,
      mainTil: 20,
      filePath: "b.mgxc",
      isMain: false,
      sortName: "we-sort",
      genre: { id: 2, name: "WE Genre" },
      weTag: { id: 3, name: "WE" },
      weDifficultyId: 5,
      weDifficulty: "⭐⭐⭐",
      unlockEventId: null,
      releaseDate: "2026-01-01",
      jacketFilePath: "we-jacket.png",
      bgiFilePath: "we-bg.png",
      bgmFilePath: "we-audio.wav",
      bgmPreviewStart: 1,
      bgmPreviewStop: 31,
      bgmManualOffset: 0.5,
      bgmRealOffset: 1.5,
      bgmEnableBarOffset: true,
      bgmInitialBpm: 140,
      bgmInitialNumerator: 3,
      bgmInitialDenominator: 4,
      isCustomStage: true,
      stageId: 42,
      notesFieldLine: { id: 0, name: "" },
      stage: { id: 0, name: "" },
      diagnostics: [],
    },
  ],
};

describe("option book helpers", () => {
  it("refreshes book metadata when main difficulty changes", () => {
    const next = applyMainDifficultyToBook(sampleBook, "WorldsEnd");

    expect(next.mainDifficulty).toBe("WorldsEnd");
    expect(next.sortName).toBe("we-sort");
    expect(next.genre?.id).toBe(2);
    expect(next.jacketFilePath).toBe("we-jacket.png");
    expect(next.bgiFilePath).toBe("we-bg.png");
    expect(next.weDifficulty).toBe("⭐⭐⭐");
    expect(next.charts.find((chart) => chart.difficulty === "WorldsEnd")?.isMain).toBe(true);
  });

  it("collects main difficulty overrides for option build", () => {
    expect(collectMainDifficultyOverrides([sampleBook])).toEqual([
      { songId: 1001, mainDifficulty: "Master" },
    ]);
  });
});
