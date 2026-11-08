import { describe, expect, it } from "vite-plus/test";
import { optionBuildCanExecute } from "@/lib/export-settings";
import { DEFAULT_EXPORT_SETTINGS } from "@/stores/tool-page-store";

describe("optionBuildCanExecute", () => {
  it("matches WPF OptionModel.CanExecute", () => {
    expect(optionBuildCanExecute(DEFAULT_EXPORT_SETTINGS)).toBe(true);
    expect(
      optionBuildCanExecute({
        ...DEFAULT_EXPORT_SETTINGS,
        convertChart: false,
        convertAudio: false,
        convertJacket: false,
        convertBackground: false,
        generateEventXml: false,
        customReleaseTagXml: true,
        customGenre: false,
        overrideChartGenre: true,
      }),
    ).toBe(false);
    expect(
      optionBuildCanExecute({
        ...DEFAULT_EXPORT_SETTINGS,
        convertChart: false,
        convertAudio: false,
        convertJacket: false,
        convertBackground: false,
        generateEventXml: true,
        customReleaseTagXml: false,
        customGenre: true,
        overrideChartGenre: false,
      }),
    ).toBe(true);
  });
});
