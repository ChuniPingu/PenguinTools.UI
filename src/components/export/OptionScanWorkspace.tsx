import { ChevronUpIcon, ScanSearchIcon } from "lucide-react";
import { useEffect, useEffectEvent, useId } from "react";
import { useTranslation } from "react-i18next";
import { OptionScanTree } from "@/components/export/OptionScanTree";
import { OptionSelectionProperties } from "@/components/export/OptionSelectionProperties";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
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
}: Readonly<{
  books: OptionScanBook[];
  chartCount: number;
  hasSource: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: OptionScanSelection | null;
  onSelect: (selection: OptionScanSelection | null) => void;
}>) {
  const { t } = useTranslation();
  const emptySummary = hasSource ? t("ui.option.scan.noMatches") : t("ui.option.scan.notScanned");
  const summary =
    books.length > 0
      ? t("ui.option.scan.summary", { books: books.length, charts: chartCount })
      : emptySummary;
  const titleId = useId();
  const descriptionId = useId();
  const onOpenChangeEvent = useEffectEvent(onOpenChange);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChangeEvent(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {books.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <ScanSearchIcon className="size-6 text-muted-foreground" />
              <h3 className="text-sm font-medium">
                {hasSource ? t("ui.option.scan.noMatches") : t("ui.option.scan.notScanned")}
              </h3>
            </div>
          ) : (
            <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0 min-w-0">
              <ResizablePanel
                defaultSize="42%"
                minSize="18%"
                className="flex min-h-0 min-w-0 flex-col"
                style={{ overflow: "hidden" }}
              >
                <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-muted/10">
                  <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5">
                    <h3 className="shrink-0 text-sm font-medium">
                      {t("ui.option.preview.contents")}
                    </h3>
                    <p className="min-w-0 truncate text-xs text-muted-foreground">{summary}</p>
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
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize="58%"
                minSize="28%"
                className="flex min-h-0 min-w-0 flex-col"
                style={{ overflow: "hidden" }}
              >
                <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                  <OptionSelectionProperties books={books} scrollableBody selection={selection} />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
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
