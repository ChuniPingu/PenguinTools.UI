import { describe, expect, it } from "vite-plus/test";
import i18n from "@/i18n";
import uiEn from "@/locales/ui.en.json";
import uiZhHans from "@/locales/ui.zh-Hans.json";

function translationKeys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = `${prefix}${key}`;
    return child && typeof child === "object" ? translationKeys(child, `${path}.`) : [path];
  });
}

describe("Simplified Chinese translations", () => {
  it("keeps UI keys in sync with English", () => {
    expect(translationKeys(uiZhHans).sort()).toEqual(translationKeys(uiEn).sort());
  });

  it("switches the active UI language", async () => {
    await i18n.changeLanguage("zh-Hans");
    expect(i18n.t("ui.settings.language.label")).toBe("语言");
    expect(i18n.t("ui.groups.chart")).toBe("谱面");
    expect(i18n.t("ui.nav.pages.audio")).toBe("转换音源");
    expect(i18n.t("ui.nav.pages.stage")).toBe("转换背景");
    expect(i18n.t("ui.option.preview.mainDifficulty")).toBe("基准难度");
    await i18n.changeLanguage("en");
  });
});
