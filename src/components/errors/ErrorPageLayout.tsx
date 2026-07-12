import type { ReactNode } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ErrorPageLayout({
  title,
  description,
  details,
  actions,
}: {
  title: string;
  description: string;
  details?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full space-y-4">
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </Alert>

        {details ? (
          <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
            {details}
          </pre>
        ) : null}

        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
