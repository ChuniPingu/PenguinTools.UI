import { ChevronUpIcon, ScanSearchIcon } from "lucide-react";
import { useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { OptionScanTree } from "@/components/export/OptionScanTree";
import { OptionSelectionProperties } from "@/components/export/OptionSelectionProperties";
import type { OptionScanBook } from "@/lib/cli-results";
import { cn } from "@/lib/utils";
import type { OptionScanSelection } from "@/stores/tool-page-store";

export function OptionScanWorkspace({
  books,
  chartCount,
  hasSource,
  open,
  onOpenChange,
  selection,
  onSelect,
}: {
  books: OptionScanBook[];
  chartCount: number;
  hasSource: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: OptionScanSelection | null;
  onSelect: (selection: OptionScanSelection | null) => void;
}) {
  const { t } = useTranslation();
  const summary =
    books.length > 0
      ? t("ui.option.scan.summary", { books: books.length, charts: chartCount })
      : hasSource
        ? t("ui.option.scan.noMatches")
        : t("ui.option.scan.notScanned");
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  return (
    <>
      {open ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label={t("ui.option.scan.closePreview")}
          className="absolute inset-x-0 top-0 bottom-10 z-10 border-0 bg-black/20 p-0 supports-backdrop-filter:backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <section
        id="scan-preview-panel"
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "absolute inset-x-0 bottom-10 z-20 flex flex-col gap-0 overflow-hidden border-t bg-popover bg-clip-padding text-sm text-popover-foreground transition-[height] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          !open && "pointer-events-none",
        )}
        style={{ height: open ? "min(75%, 44rem)" : "0px" }}
      >
        <h2 id={titleId} className="sr-only">
          {t("ui.option.scanPreview")}
        </h2>
        <p id={descriptionId} className="sr-only">
          {summary}
        </p>

        <div className="min-h-0 flex-1 overflow-hidden">
          {books.length === 0 ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 px-6 text-center">
              <ScanSearchIcon className="size-6 text-muted-foreground" />
              <h3 className="text-sm font-medium">
                {hasSource ? t("ui.option.scan.noMatches") : t("ui.option.scan.notScanned")}
              </h3>
              <p className="max-w-lg text-xs leading-5 text-muted-foreground">
                {hasSource ? t("ui.option.scan.noMatchesDescription") : t("ui.option.emptyPreview")}
              </p>
            </div>
          ) : (
            <div className="grid h-full min-h-0 lg:grid-cols-[minmax(20rem,0.85fr)_minmax(30rem,1.15fr)]">
              <aside className="flex min-h-0 min-w-0 flex-col border-b bg-muted/10 lg:border-r lg:border-b-0">
                <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5">
                  <h3 className="text-sm font-medium">{t("ui.option.preview.contents")}</h3>
                  <p className="text-xs text-muted-foreground">{summary}</p>
                </header>
                <OptionScanTree
                  key={books
                    .map(
                      (book) => `${book.songId ?? "unknown"}:${book.title}:${book.charts.length}`,
                    )
                    .join("|")}
                  books={books}
                  selection={selection}
                  className="min-h-0 flex-1 rounded-none border-0 bg-transparent"
                  onSelect={onSelect}
                />
              </aside>

              <div className="h-full min-h-0 min-w-0 overflow-y-auto bg-background">
                <OptionSelectionProperties books={books} selection={selection} />
              </div>
            </div>
          )}
        </div>
      </section>

      <button
        type="button"
        aria-controls="scan-preview-panel"
        aria-expanded={open}
        className={cn(
          "flex min-h-10 w-full shrink-0 items-center justify-between gap-3 border-t bg-muted/20 px-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:px-6",
          open && "bg-muted/40",
        )}
        onClick={() => onOpenChange(!open)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChevronUpIcon
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-linear",
              open && "rotate-180",
            )}
          />
          <span className="text-xs font-medium">{t("ui.option.scanPreview")}</span>
        </span>
        <span className="truncate text-xs text-muted-foreground">{summary}</span>
      </button>
    </>
  );
}
