import { useEffect, useState } from "react";
import { CircleAlertIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { usePageTask } from "@/hooks/use-page-task";
import { subscribePageTaskResults } from "@/lib/page-tasks";
import { DiagnosticsPanel } from "./DiagnosticsPanel";

export function PageTaskDiagnostics({ task }: Readonly<{ task: ReturnType<typeof usePageTask> }>) {
  const { t } = useTranslation();
  const { page, state } = task;
  const [open, setOpen] = useState(false);
  const hasDiagnostics = state.diagnostics.length > 0;

  useEffect(
    () =>
      subscribePageTaskResults(page, ({ diagnostics }) => {
        if (diagnostics.length) setOpen(true);
      }),
    [page],
  );

  return (
    <>
      <Button
        variant="outline"
        disabled={!hasDiagnostics}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <CircleAlertIcon className="size-4" />
        {t("ui.diagnostics.title")}
      </Button>
      <DiagnosticsPanel
        open={open && hasDiagnostics}
        diagnostics={state.diagnostics}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
