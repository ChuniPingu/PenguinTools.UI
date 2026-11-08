import { useTranslation } from "react-i18next";
import type { CliDiagnosticPayload } from "@/lib/cli-types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function DiagnosticPosition({
  diagnostic,
  className,
}: Readonly<{
  diagnostic: Pick<CliDiagnosticPayload, "time" | "timePosition" | "line">;
  className?: string;
}>) {
  const { t } = useTranslation();
  const { timePosition: position, time, line } = diagnostic;
  if (position) {
    const label = t("ui.diagnostics.positionTooltip", { ...position });
    return (
      <Tooltip>
        <TooltipTrigger
          aria-label={label}
          className={cn(
            "font-mono tabular-nums underline decoration-dotted underline-offset-4",
            className,
          )}
        >
          {position.bar} : {position.beat}
          {position.tickOffset ? ` + ${position.tickOffset}` : ""}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <span className={cn("tabular-nums", className)}>
      {time != null
        ? t("ui.diagnostics.rawTick", { tick: time })
        : line != null
          ? t("ui.diagnostics.line", { line })
          : t("ui.common.emptyValue")}
    </span>
  );
}
