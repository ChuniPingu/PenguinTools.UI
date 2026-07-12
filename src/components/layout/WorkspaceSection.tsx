import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WorkspaceSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function WorkspaceSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: WorkspaceSectionProps) {
  const titleId = useId();

  return (
    <section
      data-slot="workspace-section"
      aria-labelledby={titleId}
      className={cn("border-b", className)}
    >
      <header className="border-b bg-muted/35">
        <div className="flex min-h-10 w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
          <div className="min-w-0">
            <h2 id={titleId} className="font-heading text-sm font-medium">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </header>
      <div className={cn("w-full px-4 py-4", contentClassName)}>{children}</div>
    </section>
  );
}
