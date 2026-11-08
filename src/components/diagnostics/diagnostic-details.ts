import i18n from "@/i18n";
import type ui from "@/locales/ui.en.json";
import type { CliDiagnosticPayload, CliTickPosition } from "@/lib/cli-types";
import { resolveDiagnosticTitle, resolveMessage } from "@/lib/messages";

interface NoteDetail {
  type: string;
  tick: number;
  lane: number;
  width: number;
  timeline: number;
  timePosition?: CliTickPosition;
  endpoint?: "start" | "end";
  outputTimeline?: number;
}

interface DiagnosticDetails {
  title: string;
  stage?: string;
  description?: string;
  notes: NoteDetail[];
  isSegment?: boolean;
  source?: string;
  properties: { label: string; value: string }[];
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function number(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function position(value: unknown): CliTickPosition | undefined {
  const p = record(value);
  return p && number(p.bar) && number(p.beat) && number(p.tickOffset)
    ? { bar: p.bar, beat: p.beat, tickOffset: p.tickOffset }
    : undefined;
}

function note(value: unknown, diagnostic: CliDiagnosticPayload): NoteDetail | undefined {
  const n = record(value);
  if (
    !n ||
    typeof n.type !== "string" ||
    !number(n.tick) ||
    !number(n.lane) ||
    !number(n.width) ||
    !number(n.timeline)
  )
    return undefined;
  return {
    type: n.type,
    tick: n.tick,
    lane: n.lane,
    width: n.width,
    timeline: n.timeline,
    timePosition:
      position(n.timePosition) ??
      (n.tick === diagnostic.time ? position(diagnostic.timePosition) : undefined),
  };
}

export function noteName(type: string): string {
  const names: Record<string, string> = {
    Tap: "TAP",
    ExTap: "EX TAP",
    Flick: "FLICK",
    Damage: "DAMAGE",
    Hold: "HOLD",
    HoldJoint: "HOLD",
    Slide: "SLIDE",
    SlideJoint: "SLIDE",
    Air: "AIR",
    AirSlide: "AIR SLIDE",
    AirSlideJoint: "AIR SLIDE",
    AirHold: "AIR HOLD",
    AirHoldJoint: "AIR HOLD",
    AirCrash: "AIR CRASH",
    AirCrashJoint: "AIR CRASH",
    Sla: "SLA",
  };
  return names[type] ?? type;
}

export function noteLanes(n: Pick<NoteDetail, "lane" | "width">): string {
  return n.width > 1 ? `${n.lane + 1}–${n.lane + n.width}` : String(n.lane + 1);
}

export function getDiagnosticDetails(diagnostic: CliDiagnosticPayload): DiagnosticDetails {
  const t = i18n.t.bind(i18n);
  const key = diagnostic.message.key;
  const args = diagnostic.message.args ?? {};
  const target = record(diagnostic.target);
  const details: DiagnosticDetails = {
    title: resolveDiagnosticTitle(diagnostic.message),
    description: resolveMessage(diagnostic.message),
    notes: [],
    properties: [],
  };
  const start = note(target?.start, diagnostic),
    end = note(target?.end, diagnostic);
  const left = note(target?.left, diagnostic),
    right = note(target?.right, diagnostic);
  const single = note(target, diagnostic);
  if (start && end) {
    details.notes = [
      { ...start, endpoint: "start" },
      { ...end, endpoint: "end" },
    ];
    details.isSegment = true;
  } else if (left && right) details.notes = [left, right];
  else if (single) details.notes = [single];
  if (typeof target?.text === "string" && diagnostic.line != null) details.source = target.text;

  const property = (label: keyof typeof ui.diagnostics.detail, value: unknown) => {
    if (typeof value === "string" || number(value) || typeof value === "boolean")
      details.properties.push({ label: t(`ui.diagnostics.detail.${label}`), value: String(value) });
  };
  const staged = (stage: keyof typeof ui.diagnostics.stages) => {
    details.stage = t(`ui.diagnostics.stages.${stage}`);
  };
  switch (key) {
    case "diag.mg.length_smaller_than_unit":
      staged("convert");
      if (start)
        details.title = t("titles.diag.mg.length_smaller_than_unit_typed", {
          type: noteName(start.type),
        });
      if (target?.convertedLengthTicks === 0)
        details.description = t("details.diag.mg.length_smaller_than_unit");
      break;
    case "diag.mg.note_overlapped_in_different_til": {
      staged("convert");
      const timeline = args.arg1 ?? args["1"];
      if (number(timeline))
        details.notes = details.notes.map((n) => ({ ...n, outputTimeline: timeline }));
      break;
    }
    case "diag.warn.zero_note_speed_not_reproduced":
      staged("convert");
      property("speedModifier", 0);
      break;
    case "diag.c2s.unsupported_note_type":
      staged("parseC2s");
      property("noteType", args.noteType);
      break;
    case "diag.mgcrit.invalid_number":
      staged("parse");
      if (details.source == null) {
        property("field", args.arg0 ?? args["0"]);
        property("value", args.arg1 ?? args["1"]);
      }
      break;
    case "diag.error.audio_file_not_found":
      staged("audio");
      break;
    case "diag.mg.no_sortname_provided":
      staged("properties");
      property("songTitle", args.title);
      property("sortName", args.sortName);
      break;
  }
  if (!details.stage && (key.startsWith("diag.c2s.") || key.startsWith("diag.mgcrit.")))
    staged(key.startsWith("diag.c2s.") ? "parseC2s" : "parse");
  // Avoid repeating the same sentence when the catalog title is also the entire explanation.
  const comparable = (text: string) => text.replace(/[\s。.!！]+$/u, "").toLocaleLowerCase();
  if (details.description && comparable(details.description) === comparable(details.title))
    details.description = undefined;
  return details;
}

export function diagnosticFileName(path?: string | null): string {
  return path?.split(/[\\/]/).filter(Boolean).pop() ?? "";
}

export function diagnosticLocationText(diagnostic: CliDiagnosticPayload): string {
  const parts = [diagnostic.path];
  if (diagnostic.timePosition)
    parts.push(i18n.t("ui.diagnostics.positionTooltip", { ...diagnostic.timePosition }));
  else if (diagnostic.time != null)
    parts.push(i18n.t("ui.diagnostics.rawTick", { tick: diagnostic.time }));
  if (diagnostic.line != null) parts.push(i18n.t("ui.diagnostics.line", { line: diagnostic.line }));
  return parts.filter(Boolean).join("\n");
}
