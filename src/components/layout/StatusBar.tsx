import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TerminalIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TerminalOutput } from "@/components/output/TerminalOutput";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

function formatUptime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function StatusBar() {
  const { t } = useTranslation();
  const {
    statusDetail,
    isBusy,
    progress,
    cliOutputLines,
    cliOutputOpen,
    toggleCliOutput,
    clearCliOutput,
    cancelCliCommand,
  } = useApp();
  const { isMobile } = useSidebar();
  const [startedAt] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [terminalJumpKey, setTerminalJumpKey] = useState(0);
  const wasBusyRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    if (isBusy && !wasBusyRef.current && !cliOutputOpen) {
      setTerminalJumpKey((key) => key + 1);
    }
    wasBusyRef.current = isBusy;
  }, [cliOutputOpen, isBusy]);

  const progressValue =
    progress && progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <footer className="relative z-20 flex shrink-0 flex-col bg-muted">
      <div
        id="cli-output-panel"
        aria-hidden={!cliOutputOpen}
        inert={!cliOutputOpen}
        className={cn(
          "flex min-h-0 flex-col overflow-hidden bg-background",
          !cliOutputOpen && "pointer-events-none",
        )}
        style={{ height: "var(--cli-output-height)" }}
      >
        <div className="flex h-8 shrink-0 items-center justify-end gap-1 border-b border-border px-2">
          <Button
            variant="ghost"
            size="xs"
            disabled={!isBusy}
            onClick={() => void cancelCliCommand()}
          >
            {t("ui.common.actions.cancel")}
          </Button>
          <Button variant="ghost" size="xs" disabled={isBusy} onClick={clearCliOutput}>
            {t("ui.statusBar.clear")}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("ui.statusBar.closePanelAriaLabel")}
            onClick={toggleCliOutput}
          >
            <XIcon />
          </Button>
        </div>
        <TerminalOutput
          lines={cliOutputLines}
          autoScroll
          showPrompt={!isBusy}
          className="min-h-0 flex-1 rounded-none border-0"
        />
      </div>

      <div
        className={cn(
          "flex h-8 shrink-0 items-stretch text-xs text-muted-foreground",
          !cliOutputOpen && "border-t border-border",
        )}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={cliOutputOpen}
                aria-controls="cli-output-panel"
                aria-label={t("ui.statusBar.toggleOutputAriaLabel")}
                className={cn(
                  "h-full shrink-0 rounded-none px-0 transition-[width,background-color,color] duration-200 ease-linear",
                  isMobile ? "w-8" : "w-(--sidebar-width-icon)",
                  !cliOutputOpen && "border-r border-border",
                  "border-y-0 border-l-0",
                  "bg-cli-toggle-bg text-cli-toggle-fg hover:bg-cli-toggle-bg-hover",
                  "aria-expanded:bg-cli-toggle-bg-active aria-expanded:text-cli-toggle-fg-active aria-expanded:hover:bg-cli-toggle-bg-active-hover",
                )}
                onClick={toggleCliOutput}
              >
                <span
                  key={terminalJumpKey}
                  className={cn("inline-flex", terminalJumpKey > 0 && "animate-terminal-icon-jump")}
                >
                  <TerminalIcon />
                </span>
              </Button>
            }
          />
          <TooltipContent side="top">{t("ui.statusBar.toggleOutputTooltip")}</TooltipContent>
        </Tooltip>

        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <span className="tabular-nums">{formatUptime(elapsedSeconds)}</span>
          {isBusy && progress ? (
            <>
              <Separator orientation="vertical" className="shrink-0" />
              <Progress
                value={progressValue}
                className="w-32 shrink-0 flex-nowrap items-center gap-0 self-center [&_[data-slot=progress-track]]:h-1"
              />
              <span className="shrink-0 tabular-nums">
                {progress.completed}/{progress.total}
              </span>
            </>
          ) : null}
          {isBusy && statusDetail ? <span className="min-w-0 truncate">{statusDetail}</span> : null}
        </div>
      </div>
    </footer>
  );
}
