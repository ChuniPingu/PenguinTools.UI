import type { ReactNode } from "react";
import { ArrowRightLeftIcon, RefreshCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from "@/contexts/AppContext";
import type { usePageTask } from "@/hooks/use-page-task";
import { PageTaskStatus } from "./PageTaskStatus";
import { PageTaskDiagnostics } from "@/components/diagnostics/PageTaskDiagnostics";

interface ToolPageShellProps {
  children: ReactNode;
  bottomPanel?: ReactNode;
  task?: ReturnType<typeof usePageTask>;
  primaryLabel?: string;
  showReload?: boolean;
  reloadDisabled?: boolean;
  primaryDisabled?: boolean;
  onReload?: () => void;
  onPrimary: () => void;
}

export function ToolPageShell({
  children,
  bottomPanel,
  task,
  primaryLabel,
  showReload = true,
  reloadDisabled = false,
  primaryDisabled = false,
  onReload,
  onPrimary,
}: Readonly<ToolPageShellProps>) {
  const { t } = useTranslation();
  const { cliActionsBlocked } = useApp();
  const resolvedPrimaryLabel = primaryLabel ?? t("ui.common.actions.convert");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="min-h-0 flex-1" contentClassName="flex min-h-full flex-col">
          <main className="flex min-h-full w-full flex-1 flex-col">
            <div className="flex min-h-full flex-1 flex-col [&_[data-slot=workspace-section]:last-child]:border-b-0">
              {children}
            </div>
          </main>
        </ScrollArea>

        {bottomPanel}
      </div>

      <div className="flex min-h-13 items-center justify-end gap-2 border-t bg-muted/25 px-4 py-2 select-none sm:px-6">
        {task ? <PageTaskStatus task={task} /> : null}
        {task ? <PageTaskDiagnostics key={task.page} task={task} /> : null}
        {showReload && onReload ? (
          <Button
            variant="outline"
            disabled={cliActionsBlocked || task?.busy || task?.blocked || reloadDisabled}
            onClick={onReload}
          >
            <RefreshCwIcon className="size-4" />
            {t("ui.common.actions.reload")}
          </Button>
        ) : null}
        <Button
          disabled={cliActionsBlocked || task?.blocked || task?.busy || primaryDisabled}
          onClick={onPrimary}
        >
          <ArrowRightLeftIcon className="size-4" />
          {resolvedPrimaryLabel}
        </Button>
      </div>
    </div>
  );
}
