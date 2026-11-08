import i18n from "@/i18n";
import { assetCategoryForCatalog, assetPagePath } from "@/lib/asset-meta";
import type { CliDiagnosticPayload, MessageDescriptor } from "@/lib/cli-types";

function normalizeArgs(args?: Record<string, unknown> | null): Record<string, unknown> {
  if (!args) return {};

  const normalized: Record<string, unknown> = { ...args };
  for (const [key, value] of Object.entries(args)) {
    const indexMatch = /^arg(\d+)$/.exec(key);
    if (indexMatch) {
      normalized[indexMatch[1]] ??= value;
    }
  }

  return normalized;
}

const MISSING_ASSET_KEY = "diag.mg.string_id_not_found";

export function diagnosticAssetPath(descriptor: MessageDescriptor): string | null {
  if (descriptor.key !== MISSING_ASSET_KEY) return null;
  const args = normalizeArgs(descriptor.args);
  return assetPagePath(assetCategoryForCatalog(args["1"]));
}

export function resolveMessage(descriptor: MessageDescriptor): string {
  const args = normalizeArgs(descriptor.args);
  if (descriptor.key === MISSING_ASSET_KEY) {
    const category = assetCategoryForCatalog(args["1"]);
    if (category) args["1"] = i18n.t(`ui.assets.tabs.${category}`);
  }
  return i18n.t(descriptor.key, {
    defaultValue: descriptor.key,
    ...args,
  });
}

export function resolveDiagnosticTitle(descriptor: MessageDescriptor): string {
  return i18n.t(`titles.${descriptor.key}`, {
    ...normalizeArgs(descriptor.args),
    defaultValue: resolveMessage(descriptor),
  });
}

export function formatDiagnosticLocation(path?: string | null, line?: number | null): string {
  if (!path) return "";
  if (line != null) return `${path}:${line}`;
  return path;
}

export function formatDiagnosticTime(
  diagnostic: Pick<CliDiagnosticPayload, "time" | "timePosition">,
): string {
  const { time, timePosition } = diagnostic;
  if (timePosition) {
    if (timePosition.bar === 1 && timePosition.beat === 1 && timePosition.tickOffset === 0) {
      return i18n.t("ui.diagnostics.chartStart");
    }
    return i18n.t(
      timePosition.tickOffset === 0 ? "ui.diagnostics.timeBeat" : "ui.diagnostics.timePosition",
      {
        bar: timePosition.bar,
        beat: timePosition.beat,
        tickOffset: timePosition.tickOffset,
      },
    );
  }
  if (time == null) return "";
  if (time === 0) return i18n.t("ui.diagnostics.chartStart");
  return i18n.t("ui.diagnostics.timeTick", { tick: time });
}
