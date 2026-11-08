import { afterEach, describe, expect, it } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import i18n from "@/i18n";
import type { CliDiagnosticPayload } from "@/lib/cli-types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ALL_MESSAGE_DIAGNOSTICS } from "@/lib/debug-diagnostics";
import { DiagnosticsDetailView } from "./DiagnosticsDetailView";
import { diagnosticLocationText, getDiagnosticDetails, noteLanes } from "./diagnostic-details";

afterEach(async () => {
  await i18n.changeLanguage("en");
});

const start = {
  type: "AirSlide",
  tick: 198244,
  lane: 12,
  width: 3,
  timeline: 0,
  timePosition: { bar: 104, beat: 2, tickOffset: 4 },
};
const end = {
  ...start,
  tick: 198245,
  lane: 14,
  width: 1,
  timePosition: { bar: 104, beat: 2, tickOffset: 5 },
};
const segment: CliDiagnosticPayload = {
  severity: "Warning",
  message: { key: "diag.mg.length_smaller_than_unit" },
  path: "C:\\Charts\\sample.mgxc",
  time: start.tick,
  timePosition: start.timePosition,
  target: { start, end, sourceLengthTicks: 1, convertedLengthTicks: 0 },
};

function render(diagnostic: CliDiagnosticPayload) {
  return renderToStaticMarkup(
    <TooltipProvider>
      <DiagnosticsDetailView selected={{ ...diagnostic, id: "test" }} />
    </TooltipProvider>,
  );
}

describe.each(["en", "zh-Hans"])("diagnostic inspector in %s", (language) => {
  it("keeps the path separate and presents both original segment endpoints", async () => {
    await i18n.changeLanguage(language);
    const html = render(segment);
    expect(html).toContain('data-diagnostic-path="true">C:\\Charts\\sample.mgxc</p>');
    expect(html).toContain("AIR SLIDE");
    expect(html).toContain("13–15");
    expect(html).toContain(
      language === "zh-Hans"
        ? 'aria-label="104 小节 2 拍 + 5 Tick"'
        : 'aria-label="Bar 104, beat 2 + 5 ticks"',
    );
    expect(html).not.toContain("ui.diagnostics.");
    expect(html).not.toContain('"sourceLengthTicks"');
    expect(html).not.toContain("原谱间隔");
    expect(html).not.toContain("Source: 1 ticks");
    expect(html).not.toContain("105");
  });

  it("shows supported issue types without invented context or outcome banners", async () => {
    await i18n.changeLanguage(language);
    const cases: CliDiagnosticPayload[] = [
      {
        severity: "Error",
        message: { key: "diag.mgcrit.invalid_number", args: { arg0: "BPM", arg1: "fast" } },
        line: 128,
        target: { text: "@BPM 0'0 fast" },
      },
      { severity: "Error", message: { key: "diag.error.audio_file_not_found" }, path: "music.mp3" },
      {
        severity: "Warning",
        message: { key: "diag.mg.note_overlapped_in_different_til", args: { arg0: 1, arg1: 2 } },
        target: { left: { ...start, timeline: 1 }, right: { ...start, type: "Air", timeline: 2 } },
      },
      {
        severity: "Warning",
        message: { key: "diag.warn.zero_note_speed_not_reproduced" },
        target: { ...start, type: "Tap" },
      },
      {
        severity: "Warning",
        message: { key: "diag.c2s.unsupported_note_type", args: { noteType: "ASO" } },
        line: 91,
      },
      {
        severity: "Information",
        message: {
          key: "diag.mg.no_sortname_provided",
          args: { title: "Sample Track", sortName: "SampleTrack" },
        },
      },
    ];
    for (const diagnostic of cases) {
      const html = render(diagnostic);
      expect(html).not.toContain("ui.diagnostics.");
      expect(html).not.toContain("引用的音源");
      expect(html).not.toContain("本文件转换失败");
    }
    expect(render(cases[0])).toContain("128");
    expect(render(cases[5])).toContain("SampleTrack");
  });

  it("renders every debug diagnostic through catalog titles without leaking placeholders", async () => {
    await i18n.changeLanguage(language);
    for (const diagnostic of ALL_MESSAGE_DIAGNOSTICS) {
      const details = getDiagnosticDetails(diagnostic);
      const html = render(diagnostic);
      expect(details.title, diagnostic.message.key).not.toMatch(/^(?:titles\.|diag\.|app\.|cli\.)/);
      expect(details.title, diagnostic.message.key).not.toMatch(/\{[^{}]+\}/);
      expect(html, diagnostic.message.key).not.toContain("ui.diagnostics.");
      expect(html, diagnostic.message.key).not.toContain("titles.diag.");
    }
  });
});

it("escapes source text and renders unknown or older targets safely", () => {
  const diagnostic = {
    severity: "Warning",
    message: { key: "diag.c2s.unsupported_note_type", args: { noteType: "ASO" } },
    line: 91,
  };
  const html = render({ ...diagnostic, target: { text: "<img src=x onerror=alert(1)>" } });
  expect(html).toContain("&lt;img");
  expect(html).not.toContain("<img");
  for (const target of [
    undefined,
    "Old.Namespace.AirSlide",
    [],
    { start: { type: "AirSlide" } },
    { ...start, tick: NaN },
  ]) {
    expect(() => render({ ...segment, target })).not.toThrow();
    expect(getDiagnosticDetails({ ...segment, target }).notes).toEqual([]);
  }
});

it("never borrows one note's position for a different tick", () => {
  const legacyEnd = { ...end, timePosition: undefined };
  const detail = getDiagnosticDetails({ ...segment, target: { left: start, right: legacyEnd } });
  expect(detail.notes[0].timePosition).toEqual(start.timePosition);
  expect(detail.notes[1].timePosition).toBeUndefined();
  expect(noteLanes(end)).toBe("15");
});

it("copies the full path with available source coordinates, including tick zero", async () => {
  await i18n.changeLanguage("zh-Hans");
  expect(
    diagnosticLocationText({ ...segment, timePosition: { bar: 32, beat: 1, tickOffset: 0 } }),
  ).toBe("C:\\Charts\\sample.mgxc\n32 小节 1 拍 + 0 Tick");
  expect(
    diagnosticLocationText({ severity: "Error", message: { key: "test" }, path: "music.mp3" }),
  ).toBe("music.mp3");
  expect(
    diagnosticLocationText({
      severity: "Error",
      message: { key: "test" },
      path: "sample.ugc",
      line: 128,
    }),
  ).toBe("sample.ugc\n第 128 行");
});
