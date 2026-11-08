import { cn } from "@/lib/utils";

export function ReadonlyInputValue({
  value,
  className,
}: Readonly<{ value: string; className?: string }>) {
  return (
    <div
      title={value}
      className={cn(
        "flex h-8 min-h-8 w-full min-w-0 cursor-text items-center truncate rounded-lg border border-input bg-input/50 px-2.5 font-mono text-xs opacity-50 select-text dark:bg-input/80",
        className,
      )}
    >
      {value}
    </div>
  );
}
