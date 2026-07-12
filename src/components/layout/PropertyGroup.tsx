import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PropertyGroup({
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const titleId = useId();

  return (
    <section
      data-slot="property-group"
      aria-labelledby={titleId}
      className={cn(
        "grid min-w-0 max-w-full border-t first:border-t-0 sm:col-span-2 sm:grid-cols-subgrid",
        className,
      )}
    >
      <header className="min-w-0 border-b bg-muted/25 px-3 py-3 sm:border-r sm:border-b-0 sm:py-4">
        <h3 id={titleId} className="font-heading text-xs/relaxed font-medium text-muted-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-xs leading-4 text-muted-foreground/80 normal-case">
            {description}
          </p>
        ) : null}
      </header>
      <div className={cn("flex min-w-0 flex-col gap-4 px-3 py-4 sm:px-4", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
