import { AlertCircleIcon, AlertTriangleIcon, InfoIcon } from "lucide-react";
import type { CliDiagnosticPayload } from "@/lib/cli-types";
import type { NormalizedSeverity } from "@/lib/diagnostics";
import type { BadgeVariant } from "@/components/ui/badge";

export type SeverityFilter = "All" | NormalizedSeverity;

export type DiagnosticRow = CliDiagnosticPayload & { id: string };

export const ROW_HEIGHT = 44;

export const SEVERITY_SORT_ORDER: Record<NormalizedSeverity, number> = {
  Error: 0,
  Warning: 1,
  Information: 2,
};

export const DIAGNOSTIC_FILTERS: Array<{
  value: SeverityFilter;
  labelKey:
    | "ui.diagnostics.filters.all"
    | "ui.diagnostics.filters.error"
    | "ui.diagnostics.filters.warning"
    | "ui.diagnostics.filters.information";
}> = [
  { value: "All", labelKey: "ui.diagnostics.filters.all" },
  { value: "Error", labelKey: "ui.diagnostics.filters.error" },
  { value: "Warning", labelKey: "ui.diagnostics.filters.warning" },
  { value: "Information", labelKey: "ui.diagnostics.filters.information" },
];

export const SEVERITY_LABEL_KEYS: Record<
  NormalizedSeverity,
  | "ui.diagnostics.filters.error"
  | "ui.diagnostics.filters.warning"
  | "ui.diagnostics.filters.information"
> = {
  Error: "ui.diagnostics.filters.error",
  Warning: "ui.diagnostics.filters.warning",
  Information: "ui.diagnostics.filters.information",
};

export async function copyDiagnosticText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function toDiagnosticPayload(row: DiagnosticRow): CliDiagnosticPayload {
  const { id: _id, ...payload } = row;
  return payload;
}

export const severityBadges: Record<
  NormalizedSeverity,
  { variant: BadgeVariant; icon: typeof InfoIcon }
> = {
  Error: { variant: "diagnostic-error", icon: AlertCircleIcon },
  Warning: { variant: "diagnostic-warning", icon: AlertTriangleIcon },
  Information: { variant: "diagnostic-information", icon: InfoIcon },
};
