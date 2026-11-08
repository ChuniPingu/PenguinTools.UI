import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, MinusIcon, XIcon } from "lucide-react";
import { resolveMessage } from "@/lib/messages";
import { resolveProgressOperationLabel } from "@/lib/cli-progress";
import { cn } from "@/lib/utils";
import { useCliActivityStore, type CliActivity as Activity } from "@/stores/cli-activity-store";

const statusIcons = {
  running: ArrowLeftIcon,
  success: CheckIcon,
  error: XIcon,
  cancelled: MinusIcon,
};

function activityProgress({ completed, total, percent }: NonNullable<Activity["progress"]>) {
  if (
    typeof completed === "number" &&
    Number.isFinite(completed) &&
    typeof total === "number" &&
    Number.isFinite(total) &&
    total > 0
  ) {
    return {
      percent: Math.max(0, Math.min(100, (completed / total) * 100)),
      label: `${completed} / ${total}`,
    };
  }
  if (typeof percent === "number" && Number.isFinite(percent)) {
    const value = Math.max(0, Math.min(100, percent));
    return { percent: value, label: `${Math.round(value)}%` };
  }
  return { percent: null, label: null };
}

function outputDetail(activity: Activity) {
  if (activity.message) return resolveMessage(activity.message);
  if (activity.output) return activity.output.replace(/\s+/g, " ").slice(0, 300);
  if (activity.status !== "running") return "";
  const progress = activity.progress;
  return (
    progress?.label?.trim() ||
    progress?.item?.split(/[\\/]/).pop() ||
    (progress ? resolveProgressOperationLabel(progress.operation) : "")
  );
}

function ActivityContent({ activity, count }: Readonly<{ activity: Activity; count: number }>) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  const running = activity.status === "running";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const operationLabel = t(`ui.statusBar.operations.${activity.operation ?? "unknown"}`, {
    defaultValue: t("ui.statusBar.operations.unknown"),
  });
  const detail = outputDetail(activity) || t(`ui.statusBar.activity.${activity.status}`);
  const progress = activity.progress
    ? activityProgress(activity.progress)
    : { percent: null, label: null };
  const elapsed = Math.max(0, ((activity.endedAt ?? now) - activity.startedAt) / 1000);
  const StatusIcon = statusIcons[activity.status];

  return (
    <span
      className="cli-activity-content flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3"
      data-state={activity.status}
    >
      <span className="hidden shrink-0 items-center gap-1.5 text-[11px] sm:flex">
        <ArrowRightIcon className="size-3 text-cli-toggle-fg" aria-hidden="true" />
        <span>{operationLabel}</span>
      </span>
      <span aria-hidden="true" className="hidden h-3 w-px shrink-0 bg-border sm:block" />
      <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        <StatusIcon
          className={cn(
            "size-3",
            running && "text-cli-toggle-fg",
            activity.status === "success" && "text-emerald-600 dark:text-emerald-400",
            activity.status === "error" && "text-destructive",
          )}
        />
        <span
          key={`${activity.status}:${detail}`}
          className="cli-activity-output truncate text-[11px]"
        >
          {detail}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] tabular-nums">
        {count > 1 && (
          <span className="hidden sm:inline">{t("ui.statusBar.activity.tasks", { count })}</span>
        )}
        {running && progress.label && <span>{progress.label}</span>}
        <span>{t("ui.statusBar.activity.elapsed", { seconds: elapsed.toFixed(1) })}</span>
      </span>
      {running && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden"
        >
          <span
            className={cn(
              "cli-activity-progress block h-full bg-cli-toggle-fg/35",
              progress.percent === null && "cli-activity-sweep",
            )}
            style={progress.percent !== null ? { width: `${progress.percent}%` } : undefined}
          />
        </span>
      )}
    </span>
  );
}

export function CliActivity() {
  const { t } = useTranslation();
  const activity = useCliActivityStore((state) => state.activity);
  const count = useCliActivityStore((state) => state.activeCount);
  return (
    <div className="relative flex h-full min-w-0 flex-1 items-center overflow-hidden px-2.5 font-normal sm:px-3 [&_svg]:shrink-0">
      {activity ? (
        <ActivityContent key={activity.id} activity={activity} count={count} />
      ) : (
        <span className="flex items-center gap-1.5 text-[11px] opacity-50">
          <span aria-hidden="true" className="font-mono">
            &gt;_
          </span>
          {t("ui.statusBar.activity.idle")}
        </span>
      )}
    </div>
  );
}
