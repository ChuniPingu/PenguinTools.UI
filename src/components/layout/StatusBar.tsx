import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { TerminalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CliOutput } from "@/components/output/CliOutput";
import { CliActivity } from "@/components/layout/CliActivity";
import { useCliOutputStore } from "@/stores/cli-output-store";
import { getActiveTaskCount, subscribePageTasks } from "@/lib/page-tasks";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { t } = useTranslation();
  const activeCount = useSyncExternalStore(
    subscribePageTasks,
    getActiveTaskCount,
    getActiveTaskCount,
  );
  const isBusy = activeCount > 0;
  const cliOutputOpen = useCliOutputStore((state) => state.open);
  const toggleCliOutput = useCliOutputStore((state) => state.toggle);
  const { isMobile } = useSidebar();
  const [terminalJumpKey, setTerminalJumpKey] = useState(0);
  const wasBusyRef = useRef(false);

  useEffect(() => {
    if (isBusy && !wasBusyRef.current && !cliOutputOpen) {
      setTerminalJumpKey((key) => key + 1);
    }
    wasBusyRef.current = isBusy;
  }, [cliOutputOpen, isBusy]);

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
        <CliOutput showPrompt={!isBusy} />
      </div>

      <div
        className={cn(
          "flex h-8 shrink-0 items-stretch text-xs text-muted-foreground select-none",
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
        <CliActivity />
      </div>
    </footer>
  );
}
