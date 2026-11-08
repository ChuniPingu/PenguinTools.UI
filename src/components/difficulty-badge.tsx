import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const sizeClassName = {
  mini: "h-3 w-7 px-1 text-[9px] leading-none font-semibold tabular-nums",
  chip: "flex h-4 max-w-full min-w-0 items-center justify-center px-1.5 py-0 text-[10px] leading-none font-semibold tabular-nums",
} as const;

const styleByDifficulty: Record<number, CSSProperties> = {
  0: { backgroundColor: "var(--difficulty-basic)", color: "var(--difficulty-foreground)" },
  1: { backgroundColor: "var(--difficulty-advanced)", color: "var(--difficulty-foreground)" },
  2: { backgroundColor: "var(--difficulty-expert)", color: "var(--difficulty-foreground)" },
  3: { backgroundColor: "var(--difficulty-master)", color: "var(--difficulty-foreground)" },
  4: { backgroundColor: "var(--difficulty-ultima)", color: "var(--difficulty-foreground)" },
  5: {
    backgroundColor: "var(--difficulty-worlds-end)",
    color: "var(--difficulty-worlds-end-foreground)",
  },
};

type DifficultyBadgeSize = keyof typeof sizeClassName;

type DifficultyBadgeProps = Omit<ComponentProps<typeof Badge>, "children" | "style" | "variant"> & {
  difficulty: number;
  size: DifficultyBadgeSize;
  children: ReactNode;
  style?: CSSProperties;
};

export function DifficultyBadge({
  difficulty,
  size,
  className,
  style,
  children,
  ...props
}: DifficultyBadgeProps) {
  const difficultyStyle = styleByDifficulty[difficulty] ?? {
    backgroundColor: "var(--muted)",
    color: "var(--muted-foreground)",
  };

  return (
    <Badge
      className={cn(sizeClassName[size], className)}
      style={{
        ...difficultyStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </Badge>
  );
}
