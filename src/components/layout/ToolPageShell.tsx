import type { ReactNode } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowRightLeftIcon, HelpCircleIcon, RefreshCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from "@/contexts/AppContext";
import { DOCUMENTATION_URL } from "@/lib/cli-types";

async function openDocumentation() {
  await openUrl(DOCUMENTATION_URL);
}

interface ToolPageShellProps {
  children: ReactNode;
  bottomPanel?: ReactNode;
  primaryLabel?: string;
  showHelp?: boolean;
  showReload?: boolean;
  primaryDisabled?: boolean;
  onReload?: () => void;
  onPrimary: () => void;
}

export function ToolPageShell({
  children,
  bottomPanel,
  primaryLabel,
  showHelp = false,
  showReload = true,
  primaryDisabled = false,
  onReload,
  onPrimary,
}: ToolPageShellProps) {
  const { t } = useTranslation();
  const { isBusy } = useApp();
  const resolvedPrimaryLabel = primaryLabel ?? t("ui.common.actions.convert");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          <main className="min-h-full w-full">
            <div className="min-h-full">{children}</div>
          </main>
        </ScrollArea>

        {bottomPanel}
      </div>

      <div className="flex min-h-13 items-center justify-between gap-4 border-t bg-muted/25 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2">
          {showHelp ? (
            <Button variant="outline" disabled={isBusy} onClick={() => void openDocumentation()}>
              <HelpCircleIcon className="size-4" />
              {t("ui.common.actions.help")}
            </Button>
          ) : null}
          {showReload && onReload ? (
            <Button variant="outline" disabled={isBusy} onClick={onReload}>
              <RefreshCwIcon className="size-4" />
              {t("ui.common.actions.reload")}
            </Button>
          ) : null}
        </div>
        <Button disabled={isBusy || primaryDisabled} onClick={onPrimary}>
          <ArrowRightLeftIcon className="size-4" />
          {resolvedPrimaryLabel}
        </Button>
      </div>
    </div>
  );
}
