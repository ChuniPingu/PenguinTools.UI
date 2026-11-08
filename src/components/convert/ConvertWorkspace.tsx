import type { ReactNode } from "react";
import { FileUpIcon } from "lucide-react";

export function ConvertWorkspace({
  isDragging,
  dropMessage,
  children,
}: Readonly<{
  isDragging: boolean;
  dropMessage: string;
  children: ReactNode;
}>) {
  return (
    <div className="relative min-h-full bg-background">
      {children}
      {isDragging ? (
        <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center border border-dashed border-primary bg-background/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <span className="grid size-10 place-items-center rounded-md bg-primary/15 text-primary-foreground">
              <FileUpIcon className="size-5" />
            </span>
            <p className="text-sm font-medium select-none">{dropMessage}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
