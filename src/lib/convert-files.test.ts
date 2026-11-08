import { describe, expect, it } from "vite-plus/test";
import {
  calculateAudioTiming,
  chartOutputExtension,
  chartOutputName,
  classifyConvertFile,
  formatOffset,
  formatTimeSignature,
  jacketOutputName,
  normalizeTimeSignaturePart,
  parseTimeSignature,
  suggestedPath,
} from "@/lib/convert-files";

describe("convert file helpers", () => {
  it("classifies supported dropped files case-insensitively", () => {
    expect(classifyConvertFile("D:\\charts\\song.MGXC")).toBe("chart");
    expect(classifyConvertFile("song.c2s")).toBe("chart");
    expect(classifyConvertFile("jacket.WebP")).toBe("image");
    expect(classifyConvertFile("music.OGG")).toBe("audio");
    expect(classifyConvertFile("notes.txt")).toBe("unknown");
  });

  it("builds WPF-compatible chart and jacket names", () => {
    expect(chartOutputName("D:\\charts\\source.mgxc", "42", 3)).toBe("0042_03.c2s");
    expect(chartOutputName("D:\\charts\\source.mgxc", "", 3)).toBe("source_03.c2s");
    expect(chartOutputName("D:\\charts\\source.c2s", "42", 3)).toBe("source.mgxc");
    expect(chartOutputName("D:\\charts\\source.c2s", "42", 3, "ugc")).toBe("source.ugc");
    expect(chartOutputExtension("source.c2s")).toBe(".mgxc");
    expect(jacketOutputName("D:\\images\\cover.png", "7")).toBe("CHU_UI_Jacket_0007.dds");
    expect(jacketOutputName("D:\\images\\cover.png", "")).toBe("CHU_UI_Jacket_cover.dds");
    expect(suggestedPath("D:\\images\\cover.png", "out.dds")).toBe("D:\\images\\out.dds");
  });

  it("formats offsets with six decimal places", () => {
    expect(formatOffset(0)).toBe("0.000000");
    expect(formatOffset(1.75)).toBe("1.750000");
    expect(formatOffset(-0.25)).toBe("-0.250000");
    expect(formatOffset(null)).toBeNull();
  });

  it("formats and parses time signatures", () => {
    expect(formatTimeSignature(4, 4)).toBe("4/4");
    expect(formatTimeSignature(6, 8)).toBe("6/8");
    expect(formatTimeSignature(0, 4)).toBe("4/4");
    expect(parseTimeSignature("4/4")).toEqual({ numerator: 4, denominator: 4 });
    expect(parseTimeSignature("6 / 8")).toEqual({ numerator: 6, denominator: 8 });
    expect(parseTimeSignature("4-4")).toBeNull();
    expect(parseTimeSignature("0/4")).toBeNull();
    expect(normalizeTimeSignaturePart("6")).toBe("6");
    expect(normalizeTimeSignaturePart("")).toBe("4");
    expect(normalizeTimeSignaturePart("0", 8)).toBe("8");
  });

  it("calculates the same one-measure and real offsets as WPF", () => {
    expect(
      calculateAudioTiming({
        manualOffset: -0.25,
        insertBlankMeasure: true,
        initialBpm: 120,
        initialNumerator: 4,
        initialDenominator: 4,
      }),
    ).toEqual({ barOffset: 2, realOffset: 1.75 });
    expect(
      calculateAudioTiming({
        manualOffset: -0.25,
        insertBlankMeasure: false,
        initialBpm: 120,
        initialNumerator: 4,
        initialDenominator: 4,
      }).realOffset,
    ).toBe(-0.25);
  });
});
