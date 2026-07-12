import { describe, expect, it } from "vite-plus/test";
import i18n from "@/i18n";

describe("ui translations", () => {
  it("keeps the semantic group order available to property pages", () => {
    expect([
      i18n.t("ui.groups.song"),
      i18n.t("ui.groups.chart"),
      i18n.t("ui.groups.bgm"),
      i18n.t("ui.groups.sync"),
    ]).toEqual(["Song", "Chart", "BGM preview", "Sync & timing"]);
  });

  it("provides descriptions for the migrated domain properties", () => {
    expect(i18n.t("ui.properties.songId.description")).toContain("Song ID");
    expect(i18n.t("ui.properties.displayBpm.label")).toBe("Display BPM");
    expect(i18n.t("ui.properties.blankMeasure.description")).toContain("silent measure");
    expect(i18n.t("ui.properties.unlockEvent.description")).toContain("WORLD'S END");
  });
});
