import { beforeEach, describe, expect, it } from "vite-plus/test";
import {
  applyChartInspection,
  useToolPageStore,
  type InspectedPage,
} from "@/stores/tool-page-store";
import type { ChartInspectData } from "@/lib/cli-results";
import { canConvertInspectedChart, parseChartInspectData } from "@/lib/cli-results";

const inspected: ChartInspectData = {
  inputPath: "a.mgxc",
  chart: {
    title: "A",
    artist: "Artist",
    designer: "Designer",
    difficulty: "Master",
    level: 13,
    mainBpm: 180,
    filePath: "a.mgxc",
    songId: 123,
  },
  metadata: {
    difficultyId: 3,
    difficulty: "Master",
    bgmFilePath: "",
    fullBgmFilePath: "",
    bgmPreviewStart: 0,
    bgmPreviewStop: 0,
    bgmManualOffset: 0,
    bgmEnableBarOffset: true,
    bgmInitialBpm: 180,
    bgmInitialNumerator: 4,
    bgmInitialDenominator: 4,
    bgmBarOffset: 0,
    bgmRealOffset: 0,
    jacketFilePath: "",
    fullJacketFilePath: "",
    isCustomStage: false,
    bgiFilePath: "",
    fullBgiFilePath: "",
    notesFieldLine: { id: 0, name: "" },
    stage: { id: 0, name: "" },
  },
};

describe.each<InspectedPage>(["chart", "extractChart"])("%s inspection", (page) => {
  beforeEach(() => useToolPageStore.setState(useToolPageStore.getInitialState(), true));

  function select(path: string) {
    const store = useToolPageStore.getState();
    const patch = page === "chart" ? store.patchChart : store.patchExtractChart;
    patch({ chartPath: path });
  }

  it("invalidates old metadata immediately when the source changes", () => {
    select("a.mgxc");
    expect(applyChartInspection(page, "a.mgxc", inspected)).toBe(true);
    select("b.mgxc");
    expect(useToolPageStore.getState()[page]).toMatchObject({
      chartPath: "b.mgxc",
      inspectedPath: "",
      data: null,
    });
  });

  it("replaces full inspection with header-only data when the file version increases", () => {
    select("a.mgxc");
    applyChartInspection(page, "a.mgxc", inspected);
    expect(canConvertInspectedChart(inspected)).toBe(true);
    const data = parseChartInspectData({
      type: "result",
      schemaVersion: 4,
      operation: "chart.inspect",
      success: true,
      exitCode: 0,
      data: {
        inputPath: inspected.inputPath,
        chart: inspected.chart,
        notesParsed: false,
        formatVersion: 5,
      },
      diagnostics: [],
    });
    expect(data).not.toBeNull();
    expect(applyChartInspection(page, "a.mgxc", data)).toBe(true);
    expect(useToolPageStore.getState()[page]).toMatchObject({ inspectedPath: "a.mgxc", data });
    expect(canConvertInspectedChart(useToolPageStore.getState()[page].data)).toBe(false);
    expect(useToolPageStore.getState()[page]).toMatchObject({ insertBlankMeasure: false });
  });

  it("ignores stale successes and failures without overwriting the current source", () => {
    select("b.mgxc");
    const current = useToolPageStore.getState()[page];
    expect(applyChartInspection(page, "a.mgxc", inspected)).toBe(false);
    expect(applyChartInspection(page, "a.mgxc", null)).toBe(false);
    expect(useToolPageStore.getState()[page]).toBe(current);
  });

  it("applies metadata to the requested path and clears it if a reload fails", () => {
    select(" a.mgxc ");
    applyChartInspection(page, "a.mgxc", inspected);
    expect(useToolPageStore.getState()[page]).toMatchObject({
      inspectedPath: "a.mgxc",
      data: inspected,
    });
    expect(useToolPageStore.getState()[page]).toMatchObject({
      songId: "123",
      designer: "Designer",
      mainBpm: "180",
      insertBlankMeasure: true,
    });
    applyChartInspection(page, "a.mgxc", null);
    expect(useToolPageStore.getState()[page]).toMatchObject({ inspectedPath: "", data: null });
  });
});
