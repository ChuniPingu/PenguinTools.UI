import { describe, expect, it } from "vite-plus/test";
import { detectSystemLanguage } from "@/lib/ui-settings";

describe("detectSystemLanguage", () => {
  it("maps Chinese tags to zh-Hans", () => {
    expect(detectSystemLanguage(["zh-CN"])).toBe("zh-Hans");
    expect(detectSystemLanguage(["zh-Hans"])).toBe("zh-Hans");
    expect(detectSystemLanguage(["zh-hans-cn"])).toBe("zh-Hans");
    expect(detectSystemLanguage(["zh_CN"])).toBe("zh-Hans");
    expect(detectSystemLanguage(["zh"])).toBe("zh-Hans");
    expect(detectSystemLanguage(["zh-SG"])).toBe("zh-Hans");
    expect(detectSystemLanguage(["zh-TW"])).toBe("zh-Hans");
    expect(detectSystemLanguage(["zh-HK"])).toBe("zh-Hans");
  });

  it("falls back to English for unsupported locales", () => {
    expect(detectSystemLanguage(["en-US"])).toBe("en");
    expect(detectSystemLanguage(["ja-JP"])).toBe("en");
    expect(detectSystemLanguage([])).toBe("en");
  });

  it("uses the first matching preferred language", () => {
    expect(detectSystemLanguage(["ja-JP", "zh-CN", "en"])).toBe("zh-Hans");
    expect(detectSystemLanguage(["fr-FR", "en-GB"])).toBe("en");
  });
});
