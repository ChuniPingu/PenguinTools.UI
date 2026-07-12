import type { ReactNode } from "react";
import { HelpHint } from "@/components/convert/HelpHint";
import { FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function PropertyRow({
  label,
  description,
  labelAction,
  htmlFor,
  children,
  className,
  controlClassName,
}: {
  label: string;
  description?: string;
  labelAction?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  controlClassName?: string;
}) {
  return (
    <div
      data-slot="property-row"
      className={cn(
        "grid min-w-0 gap-2 border-t py-3 first:border-t-0 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {htmlFor ? (
            <FieldLabel htmlFor={htmlFor} className="text-xs/relaxed">
              {label}
            </FieldLabel>
          ) : (
            <p className="text-xs/relaxed">{label}</p>
          )}
          {description ? <HelpHint title={label} description={description} /> : null}
        </div>
        {labelAction ? <div className="mt-0.5 flex items-center">{labelAction}</div> : null}
      </div>
      <div className={cn("min-w-0 self-start", controlClassName)}>{children}</div>
    </div>
  );
}
