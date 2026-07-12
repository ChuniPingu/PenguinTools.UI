import {
  ChevronRightIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DifficultyBadge } from "@/components/difficulty-badge";
import type { OptionScanBook } from "@/lib/cli-results";
import {
  chartDifficultyIdFromName,
  formatWeDifficulty,
  isWorldsEndDifficulty,
  normalizeDifficultyName,
} from "@/lib/chart-difficulty";
import { cn } from "@/lib/utils";
import type { OptionScanSelection } from "@/stores/tool-page-store";

function chartFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] ?? filePath;
}

function chartTreeLabel(chart: OptionScanBook["charts"][number]): string {
  if (isWorldsEndDifficulty(chart.difficulty)) {
    const weLabel = chart.weTag?.name?.trim() || "WE";
    const weDifficulty = formatWeDifficulty(
      chart.weDifficultyId ?? 0,
      chart.weDifficulty?.trim() ?? "",
    );
    return [weLabel, weDifficulty].filter(Boolean).join(" ");
  }

  return `${normalizeDifficultyName(chart.difficulty)} ${chart.level.toFixed(1)}`;
}

export function OptionScanTree({
  books,
  selection,
  onSelect,
  className,
}: {
  books: OptionScanBook[];
  selection: OptionScanSelection | null;
  onSelect: (selection: OptionScanSelection | null) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [expandedBookIndex, setExpandedBookIndex] = useState<number | null>(
    books.length > 0 ? 0 : null,
  );

  if (books.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[6.25rem] w-full items-center justify-center border-dashed bg-muted/15 px-4 text-center",
          className,
        )}
      >
        <p className="text-xs/relaxed text-muted-foreground">{t("ui.option.scan.noBooks")}</p>
      </div>
    );
  }

  const toggleExpanded = (bookIndex: number) => {
    setExpandedBookIndex((current) => (current === bookIndex ? null : bookIndex));
  };

  return (
    <div className={cn("h-[6.25rem] w-full overflow-y-auto bg-background", className)}>
      <ul role="tree" className="w-full py-1.5">
        {books.map((book, bookIndex) => {
          const expanded = expandedBookIndex === bookIndex;
          const bookSelected = selection?.kind === "book" && selection.bookIndex === bookIndex;

          return (
            <li
              key={`${book.songId ?? "unknown"}-${book.title}-${bookIndex}`}
              role="treeitem"
              aria-expanded={expanded}
              aria-selected={bookSelected}
            >
              <div
                className={cn(
                  "mx-1 flex min-h-8 items-center gap-1 rounded-sm pr-2 text-xs",
                  bookSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
                )}
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={t("ui.option.preview.expandBook")}
                  className="grid size-7 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => toggleExpanded(bookIndex)}
                >
                  <ChevronRightIcon
                    className={cn("size-3.5 transition-transform", expanded && "rotate-90")}
                  />
                </button>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
                  onClick={() => {
                    setExpandedBookIndex(bookIndex);
                    onSelect({ kind: "book", bookIndex });
                  }}
                >
                  {expanded ? (
                    <FolderOpenIcon className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 truncate">
                    {book.songId != null ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {book.songId}{" "}
                      </span>
                    ) : null}
                    <span>{book.title}</span>
                  </span>
                </button>
              </div>

              {expanded ? (
                <ul role="group" className="ml-4 border-l pb-1 pl-2">
                  {book.charts.map((chart, chartIndex) => {
                    const selected =
                      selection?.kind === "chart" &&
                      selection.bookIndex === bookIndex &&
                      selection.chartIndex === chartIndex;

                    return (
                      <li
                        key={`${chart.filePath}-${chartIndex}`}
                        role="treeitem"
                        aria-selected={selected}
                      >
                        <button
                          type="button"
                          className={cn(
                            "flex w-[calc(100%-0.25rem)] min-w-0 items-center gap-2 rounded-sm py-1.5 pr-2 pl-2 text-left text-xs leading-5",
                            selected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
                          )}
                          onClick={() => {
                            setExpandedBookIndex(bookIndex);
                            onSelect({ kind: "chart", bookIndex, chartIndex });
                          }}
                        >
                          <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex min-w-0 flex-1 items-center gap-1.5">
                            {chart.isMain ? (
                              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                                {t("ui.option.preview.main")}
                              </span>
                            ) : null}
                            <span className="min-w-0 truncate font-mono">
                              {chartFileName(chart.filePath)}
                            </span>
                          </span>
                          <DifficultyBadge
                            difficulty={chartDifficultyIdFromName(chart.difficulty) ?? -1}
                            size="chip"
                          >
                            {chartTreeLabel(chart)}
                          </DifficultyBadge>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {chart.diagnostics?.length ? (
                              <TriangleAlertIcon
                                className="size-3.5 text-amber-500"
                                aria-label={t("ui.option.scan.hasDiagnostics")}
                              />
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
