import { forwardRef, type ComponentType } from "react";
import { ArrowDownToLineIcon, type LucideIcon, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sidebar nav icon: Lucide SVG or a composed wrapper (e.g. extract badge). */
export type NavIcon = LucideIcon | ComponentType<{ className?: string }>;

/**
 * Reuses a Convert-style base glyph with a corner extract mark.
 * The mark keeps Lucide stroke weight, uses sidebar-primary for contrast
 * in light/dark, and sits on a knockout plate so it does not collide with
 * the base icon.
 */
export function createExtractNavIcon(BaseIcon: LucideIcon): NavIcon {
  const ExtractNavIcon = forwardRef<HTMLSpanElement, LucideProps>(
    ({ className, ...props }, ref) => (
      <span ref={ref} className={cn("relative inline-flex size-4 shrink-0", className)} aria-hidden>
        <BaseIcon className="!size-4" {...props} />
        <span
          className={cn(
            "pointer-events-none absolute -right-0.5 -bottom-0.5 flex size-[11px] items-center justify-center rounded-[2px]",
            "bg-sidebar group-hover/menu-button:bg-sidebar-accent group-data-active/menu-button:bg-sidebar-accent",
          )}
        >
          <ArrowDownToLineIcon
            absoluteStrokeWidth
            strokeWidth={2}
            className="!size-2 text-sidebar-primary"
          />
        </span>
      </span>
    ),
  );
  ExtractNavIcon.displayName = `ExtractNav(${BaseIcon.displayName ?? "Icon"})`;
  return ExtractNavIcon;
}
