import { describe, expect, it } from "vite-plus/test";
import {
  collectOptionChartFilePaths,
  collectOptionScanDiagnostics,
  formatBuildTimestamp,
  formatChartSummary,
  formatFileChangedMessage,
  formatLocalTime,
  parseCliInfoResult,
  parseOptionScanData,
} from "@/lib/cli-results";
import type { OptionScanBook, OptionScanChart } from "@/lib/cli-results";
import type { CliResponse } from "@/lib/cli-types";

const emptyEntry = { id: 0, name: "" };

function scanChart(filePath: string, difficulty: string): OptionScanChart {
  return {
    difficulty,
    mgxcId: "1001",
    songId: 1001,
    title: "Song A",
    artist: "Artist",
    designer: "Designer",
    level: difficulty === "Master" ? 13 : 12,
    mainBpm: 180,
    mainTil: 0,
    isMain: difficulty === "Master",
    filePath,
    weTag: emptyEntry,
    weDifficultyId: 0,
    weDifficulty: "",
    sortName: "song-a",
    genre: emptyEntry,
    unlockEventId: null,
    releaseDate: "2026-01-01",
    jacketFilePath: "",
    bgmFilePath: "",
    bgmPreviewStart: 0,
    bgmPreviewStop: 0,
    bgmManualOffset: 0,
    bgmRealOffset: 0,
    bgmEnableBarOffset: false,
    bgmInitialBpm: 120,
    bgmInitialNumerator: 4,
    bgmInitialDenominator: 4,
    isCustomStage: false,
    stageId: null,
    bgiFilePath: "",
    notesFieldLine: emptyEntry,
    stage: emptyEntry,
    diagnostics: [],
  };
}

function scanBook(charts: OptionScanChart[]): OptionScanBook {
  return {
    songId: 1001,
    title: "Song A",
    artist: "Artist",
    mainDifficulty: "Master",
    sortName: "song-a",
    genre: emptyEntry,
    unlockEventId: null,
    releaseDate: "2026-01-01",
    isCustomStage: false,
    stageId: null,
    bgiFilePath: "",
    notesFieldLine: emptyEntry,
    stage: emptyEntry,
    weTag: emptyEntry,
    weDifficultyId: 0,
    weDifficulty: "",
    jacketFilePath: "",
    bgmFilePath: "",
    bgmPreviewStart: 0,
    bgmPreviewStop: 0,
    bgmManualOffset: 0,
    bgmRealOffset: 0,
    bgmEnableBarOffset: false,
    bgmInitialBpm: 120,
    bgmInitialNumerator: 4,
    bgmInitialDenominator: 4,
    charts,
  };
}

describe("option export helpers", () => {
  it("accepts a successful scan with no matching charts", () => {
    const response = {
      type: "result",
      schemaVersion: 3,
      operation: "option.scan",
      success: true,
      exitCode: 0,
      message: null,
      data: { books: [], configPath: null, config: null },
      diagnostics: [],
    } satisfies CliResponse;

    expect(parseOptionScanData(response)).toEqual({
      books: [],
      configPath: null,
      config: null,
    });
  });

  it("collects chart file paths from scanned books", () => {
    expect(
      collectOptionChartFilePaths([
        scanBook([
          scanChart("C:\\charts\\a.mgxc", "Master"),
          scanChart("C:\\charts\\b.mgxc", "Expert"),
        ]),
      ]),
    ).toEqual(["C:\\charts\\a.mgxc", "C:\\charts\\b.mgxc"]);
  });

  it("flattens unmatched and chart diagnostics for the diagnostics panel", () => {
    const unmatched = {
      severity: "Error",
      message: { key: "diag.error.file_ignored_due_to_id_missing" },
      path: "graduation/chart.ugc",
    };
    const chartDiag = {
      severity: "Warning",
      message: { key: "diag.warn.no_chart_marked_main" },
      path: "song/a.ugc",
    };
    const chart = scanChart("C:\\charts\\song\\a.ugc", "Master");
    chart.diagnostics = [chartDiag];

    const response = {
      type: "result",
      schemaVersion: 3,
      operation: "option.scan",
      success: true,
      exitCode: 0,
      message: null,
      data: {
        books: [scanBook([chart])],
        configPath: null,
        config: null,
        unmatchedDiagnostics: [unmatched],
      },
      // Backend also surfaces unmatched on top-level; ensure no duplicates.
      diagnostics: [unmatched],
    } satisfies CliResponse;

    expect(collectOptionScanDiagnostics(response)).toEqual([chartDiag, unmatched]);
  });

  it("formats the reload hint with a local time", () => {
    const message = formatFileChangedMessage(new Date("2026-07-12T08:30:45"));
    expect(message).toMatch(/modified at \d{2}:\d{2}:\d{2}\./);
    expect(message).toContain("Reload to use the latest version.");
  });

  it("groups inspected metadata using WPF terminology", () => {
    const summary = formatChartSummary({
      songId: 123,
      title: "Song A",
      artist: "Artist",
      designer: "Designer",
      difficulty: "Master",
      level: 13,
      mainBpm: 180,
      filePath: "C:\\charts\\a.mgxc",
    });

    expect(summary).toContain("Song\nTitle: Song A");
    expect(summary).toContain("Chart\nDesigner: Designer");
    expect(summary).toContain("Display BPM: 180");
    expect(summary).toContain("Details\nFile: C:\\charts\\a.mgxc");
  });
});

describe("cli info helpers", () => {
  it("parses the info command payload", () => {
    const response = {
      type: "result",
      schemaVersion: 3,
      operation: "info",
      success: true,
      exitCode: 0,
      message: null,
      data: {
        applicationName: "PenguinTools.CLI",
        version: "1.13.0.0",
        buildDateUtc: "2026-07-12T20:01:33+08:00",
        baseDirectory: "C:\\runtime\\0.1.0\\",
        tempWorkPath: "C:\\temp",
        infrastructureAssetsPath: "C:\\runtime\\0.1.0\\assets",
      },
      diagnostics: [],
    } satisfies CliResponse;

    expect(parseCliInfoResult(response)).toEqual({
      applicationName: "PenguinTools.CLI",
      version: "1.13.0.0",
      buildDateUtc: "2026-07-12T20:01:33+08:00",
      baseDirectory: "C:\\runtime\\0.1.0\\",
      tempWorkPath: "C:\\temp",
      infrastructureAssetsPath: "C:\\runtime\\0.1.0\\assets",
    });
  });

  it("formats build timestamps with the shared local time style", () => {
    const date = new Date(2026, 6, 12, 20, 1, 33);
    const formatted = formatBuildTimestamp(date.toISOString());

    expect(formatted).toMatch(/2026/);
    expect(formatted).toContain(formatLocalTime(date));
  });
});
