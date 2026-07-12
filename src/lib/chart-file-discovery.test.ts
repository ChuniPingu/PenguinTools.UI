import { describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_CHART_FILE_DISCOVERY,
  moveChartFormat,
  normalizeChartFileDiscovery,
  parseChartFileDiscovery,
  serializeChartFileDiscovery,
} from "@/lib/chart-file-discovery";

describe("chart file discovery order", () => {
  it("defaults to mgxc followed by ugc", () => {
    expect(DEFAULT_CHART_FILE_DISCOVERY).toBe("[mgxc, ugc]");
  });

  it("parses and serializes the CLI list format", () => {
    expect(parseChartFileDiscovery("[mgxc, ugc, sus]")).toEqual(["mgxc", "ugc", "sus"]);
    expect(parseChartFileDiscovery("mgxc, 'ugc'")).toEqual(["mgxc", "ugc"]);
    expect(serializeChartFileDiscovery(["sus", "mgxc"])).toBe("[sus, mgxc]");
  });

  it("normalizes CLI format names and legacy numeric enum values", () => {
    expect(normalizeChartFileDiscovery([0, "Ugc", "sus", "unknown", 99, "ugc"])).toEqual([
      "mgxc",
      "ugc",
      "sus",
    ]);
  });

  it("moves formats without mutating the original order", () => {
    const formats = ["mgxc", "ugc", "sus"];

    expect(moveChartFormat(formats, 0, 2)).toEqual(["ugc", "sus", "mgxc"]);
    expect(formats).toEqual(["mgxc", "ugc", "sus"]);
  });
});
