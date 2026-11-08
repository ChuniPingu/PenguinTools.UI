import { afterEach, describe, expect, it } from "vite-plus/test";
import i18n from "@/i18n";
import { formatDiagnosticTime, resolveDiagnosticTitle, resolveMessage } from "@/lib/messages";
import messagesEn from "@/locales/messages.en.json";
import messagesZh from "@/locales/messages.zh-Hans.json";

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe.each([
  {
    language: "zh-Hans",
    start: "谱面开头",
    beat: "2 小节，3 拍",
    offset: "2 小节 3 拍 + 12 Tick",
    fallback: "时间：480 tick",
  },
  {
    language: "en",
    start: "Start of chart",
    beat: "Bar 2, beat 3",
    offset: "Bar 2, beat 3 + 12 ticks",
    fallback: "Time: 480 ticks",
  },
])("diagnostic time in $language", ({ language, start, beat, offset, fallback }) => {
  it("names the chart start with or without a musical position", async () => {
    await i18n.changeLanguage(language);
    expect(formatDiagnosticTime({ time: 0 })).toBe(start);
    expect(formatDiagnosticTime({ timePosition: { bar: 1, beat: 1, tickOffset: 0 } })).toBe(start);
  });

  it("uses the supplied musical position even when the raw time is zero", async () => {
    await i18n.changeLanguage(language);
    expect(
      formatDiagnosticTime({ time: 0, timePosition: { bar: 2, beat: 3, tickOffset: 0 } }),
    ).toBe(beat);
  });

  it("preserves nonzero offsets and raw positions without inventing a bar number", async () => {
    await i18n.changeLanguage(language);
    expect(formatDiagnosticTime({ timePosition: { bar: 2, beat: 3, tickOffset: 12 } })).toBe(
      offset,
    );
    expect(formatDiagnosticTime({ time: 480 })).toBe(fallback);
    expect(formatDiagnosticTime({})).toBe("");
  });
});

it("renders a concrete adjustment from backend diagnostic arguments", async () => {
  await i18n.changeLanguage("zh-Hans");
  expect(
    resolveMessage({
      key: "diag.warn.editor_width_adjusted",
      args: { arg0: "UGC v9", arg1: "SLIDE", arg2: 20, arg3: 16 },
    }),
  ).toBe("输出 UGC v9 时，SLIDE 的宽度已从 20 调整为 16。");
});

function leafKeys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string" ? [path] : leafKeys(child, path);
  });
}

it("provides catalog titles for every diagnostic and application message in both languages", () => {
  for (const catalog of [messagesEn, messagesZh]) {
    const messages = leafKeys({ app: catalog.app, cli: catalog.cli, diag: catalog.diag });
    const titles = leafKeys(catalog.titles);
    expect(titles).toEqual(expect.arrayContaining(messages));
  }
  expect(leafKeys(messagesEn.titles).sort()).toEqual(leafKeys(messagesZh.titles).sort());
});

it("interpolates diagnostic titles and falls back for unknown future messages", async () => {
  await i18n.changeLanguage("zh-Hans");
  expect(
    resolveDiagnosticTitle({
      key: "diag.mgcrit.invalid_number",
      args: { arg0: "BPM", arg1: "fast" },
    }),
  ).toBe("BPM 填写不正确");
  expect(resolveDiagnosticTitle({ key: "future.diagnostic" })).toBe("future.diagnostic");
});
