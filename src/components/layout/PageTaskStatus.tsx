import { useTranslation } from "react-i18next";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { usePageTask } from "@/hooks/use-page-task";
import type { PageTaskSnapshot } from "@/lib/page-task-controller";
import { assetsAreBusy } from "@/lib/page-tasks";

function statusLabel(
  state: PageTaskSnapshot,
  labels: {
    cancelled: string;
    complete: string;
    waiting: string;
    preparing: string;
    cancelling: string;
    failed: string;
    working: string;
  },
) {
  if (state.status === "error") return labels.failed;
  if (state.status === "cancelled") return labels.cancelled;
  if (state.status === "waiting")
    return state.operation === "assets.collect" ? labels.waiting : labels.preparing;
  if (state.status === "cancelling") return labels.cancelling;
  if (state.status !== "running") return labels.complete;
  let label = labels.working;
  if (state.progress?.total != null)
    label += ` ${state.progress.completed ?? 0}/${state.progress.total}`;
  return label;
}

export function PageTaskStatus({ task }: Readonly<{ task: ReturnType<typeof usePageTask> }>) {
  const { t } = useTranslation();
  const { state, busy, cancel } = task;
  const assetsBlocked = assetsAreBusy() && !busy;
  if (state.status === "idle" && !assetsBlocked) return null;
  const label = assetsBlocked
    ? t("ui.tasks.assetsBusy")
    : statusLabel(state, {
        cancelled: t("ui.tasks.cancelledStatus"),
        complete: t("ui.tasks.completedStatus"),
        waiting: t("ui.tasks.waiting"),
        preparing: t("ui.tasks.preparing"),
        cancelling: t("ui.tasks.cancelling"),
        failed: t("ui.tasks.failed"),
        working: t("ui.progress.working"),
      });
  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-2 text-xs"
      role="status"
      aria-live="polite"
    >
      {busy ? <Spinner className="size-3.5 shrink-0" /> : null}
      <span
        className={
          state.status === "error"
            ? "min-w-0 truncate text-destructive"
            : "min-w-0 truncate text-muted-foreground"
        }
        title={label}
      >
        {label}
      </span>
      {busy ? (
        <Button
          variant="destructive"
          size="xs"
          onClick={cancel}
          disabled={state.status === "cancelling"}
        >
          <XIcon className="size-3" aria-hidden="true" data-icon="inline-start" />
          {t("ui.common.actions.cancel")}
        </Button>
      ) : null}
    </div>
  );
}
