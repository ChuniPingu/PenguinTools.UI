import { useTranslation } from "react-i18next";
import { normalizeSeverity } from "@/lib/diagnostics";
import { SEVERITY_LABEL_KEYS, severityBadges } from "./diagnostics-shared";
import { cn } from "@/lib/utils";

export function DiagnosticSeverity({
  severity,
  compact = false,
}: Readonly<{ severity: string; compact?: boolean }>) {
  const { t } = useTranslation();
  const level = normalizeSeverity(severity);
  const Icon = severityBadges[level].icon;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs", {
        "text-red-700 dark:text-red-400": level === "Error",
        "text-amber-700 dark:text-amber-400": level === "Warning",
        "text-slate-600 dark:text-slate-400": level === "Information",
      })}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className={compact ? "sr-only sm:not-sr-only" : undefined}>
        {t(SEVERITY_LABEL_KEYS[level])}
      </span>
    </span>
  );
}
