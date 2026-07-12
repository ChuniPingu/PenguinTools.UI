import { describe, expect, it } from "vite-plus/test";
import {
  chartDifficultyIdFromName,
  formatChartLevelLabel,
  formatWeDifficulty,
  isWorldsEndDifficulty,
  normalizeDifficultyName,
} from "@/lib/chart-difficulty";

describe("chart difficulty helpers", () => {
  it("normalizes WorldsEnd enum names for display", () => {
    expect(normalizeDifficultyName("WorldsEnd")).toBe("WORLD'S END");
    expect(isWorldsEndDifficulty("WorldsEnd")).toBe(true);
    expect(isWorldsEndDifficulty("World's End")).toBe(true);
    expect(isWorldsEndDifficulty("Master")).toBe(false);
  });

  it("formats WORLD'S END chart rows with star difficulty", () => {
    expect(formatChartLevelLabel("WorldsEnd", 13, 5)).toBe("3★");
    expect(formatWeDifficulty(9)).toBe("5★");
    expect(formatWeDifficulty(0, "⭐⭐⭐")).toBe("3★");
    expect(formatWeDifficulty(0, "⭐️⭐️")).toBe("2★");
    expect(formatWeDifficulty(0, "4 ⭐")).toBe("4★");
    expect(formatChartLevelLabel("Master", 13.5)).toBe("13.5");
  });

  it("maps PenguinTools difficulty names to their badge color IDs", () => {
    expect(chartDifficultyIdFromName("Basic")).toBe(0);
    expect(chartDifficultyIdFromName("Ultima")).toBe(4);
    expect(chartDifficultyIdFromName("WorldsEnd")).toBe(5);
  });
});
