import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function ComputedValue({
  id,
  value,
  className,
}: Readonly<{
  id?: string;
  value: ReactNode;
  className?: string;
}>) {
  const { t } = useTranslation();
  const display = value == null || value === "" ? t("ui.common.emptyValue") : value;
  const title = typeof display === "string" ? display : undefined;

  return (
    <output
      id={id}
      title={title}
      className={cn(
        "block min-w-0 rounded-sm bg-muted/45 px-3 py-2 font-mono text-xs/relaxed tabular-nums select-text",
        className,
      )}
    >
      <span className="block truncate">{display}</span>
    </output>
  );
}
