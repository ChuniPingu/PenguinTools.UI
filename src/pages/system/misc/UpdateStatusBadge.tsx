import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { UpdateStatus } from "@/lib/app-updater";
import { cn } from "@/lib/utils";

export function UpdateStatusBadge({
  status,
  message,
}: Readonly<{ status: UpdateStatus; message: string }>) {
  const busy =
    status === "checking" ||
    status === "downloading" ||
    status === "waitingForJob" ||
    status === "installing";
  let colorClass = "text-muted-foreground";
  if (status === "error") colorClass = "text-destructive";
  else if (status === "available") colorClass = "text-foreground";

  let icon = null;
  if (busy) icon = <Spinner className="size-3.5 shrink-0" />;
  else if (status === "error") icon = <CircleAlertIcon className="size-3.5 shrink-0" />;
  else if (status === "upToDate" || status === "available") {
    icon = <CircleCheckIcon className="size-3.5 shrink-0" />;
  }

  return (
    <p className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5 text-sm", colorClass)}>
      {icon}
      <span className="min-w-0">{message}</span>
    </p>
  );
}
