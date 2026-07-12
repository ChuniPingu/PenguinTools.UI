import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatFileChangedMessage } from "@/lib/cli-results";

export function FileChangedAlert({
  changedAt,
  className,
}: {
  changedAt: Date | null;
  className?: string;
}) {
  if (!changedAt) return null;

  return (
    <Alert variant="destructive" className={className}>
      <TriangleAlertIcon />
      <AlertDescription>{formatFileChangedMessage(changedAt)}</AlertDescription>
    </Alert>
  );
}
