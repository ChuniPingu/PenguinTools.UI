import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DiagnosticsSortHeader({
  label,
  sorted,
  onToggle,
  compact = false,
}: Readonly<{
  label: string;
  sorted: false | "asc" | "desc";
  onToggle: () => void;
  compact?: boolean;
}>) {
  const sortedIcon = sorted === "asc" ? ArrowUpIcon : ArrowDownIcon;
  const Icon = sorted ? sortedIcon : ArrowUpDownIcon;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("diagnostics-sort-header", compact && "diagnostics-sort-compact")}
      data-sorted={sorted || undefined}
      onClick={onToggle}
    >
      {label}
      <Icon data-icon="inline-end" aria-hidden="true" />
    </Button>
  );
}
