import { useTranslation } from "react-i18next";
import type { CliDiagnosticPayload } from "@/lib/cli-types";
import { DiagnosticsDetailView } from "@/components/diagnostics/DiagnosticsDetailView";
import { DiagnosticsToolbar } from "@/components/diagnostics/DiagnosticsToolbar";
import { DiagnosticsVirtualTable } from "@/components/diagnostics/DiagnosticsVirtualTable";
import { useDiagnosticsPanel } from "@/components/diagnostics/use-diagnostics-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { CopyIcon, CrosshairIcon } from "lucide-react";
import { diagnosticLocationText } from "./diagnostic-details";
import "./diagnostics-panel.css";

interface DiagnosticsPanelProps {
  open: boolean;
  diagnostics: CliDiagnosticPayload[];
  onClose: () => void;
}

export function DiagnosticsPanel({ open, diagnostics, onClose }: Readonly<DiagnosticsPanelProps>) {
  const { t } = useTranslation();
  const {
    columns,
    counts,
    copyLocation,
    copySelected,
    filter,
    globalFilter,
    paddingBottom,
    paddingTop,
    rowVirtualizer,
    selected,
    setFilter,
    setGlobalFilter,
    setScrollElement,
    setSelectedId,
    table,
    tableRows,
    totalCount,
    virtualRows,
  } = useDiagnosticsPanel(diagnostics, open, onClose);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} disablePointerDismissal>
      <DialogContent className="diagnostics-panel">
        <DialogHeader>
          <DialogTitle>{t("ui.diagnostics.title")}</DialogTitle>
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 gap-0">
          <DiagnosticsToolbar
            filter={filter}
            globalFilter={globalFilter}
            onFilterChange={setFilter}
            onGlobalFilterChange={setGlobalFilter}
            counts={counts}
          />

          <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
            <ResizablePanel defaultSize="52%" minSize="20%">
              <DiagnosticsVirtualTable
                columns={columns}
                onScrollElementChange={setScrollElement}
                onSelectRow={setSelectedId}
                paddingBottom={paddingBottom}
                paddingTop={paddingTop}
                rowVirtualizer={rowVirtualizer}
                selectedId={selected?.id ?? null}
                table={table}
                tableRows={tableRows}
                virtualRows={virtualRows}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize="48%" minSize="25%">
              <DiagnosticsDetailView selected={selected} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </DialogBody>

        <DialogFooter>
          <span className="diagnostics-count" aria-live="polite">
            {t("ui.diagnostics.countSummary", { shown: tableRows.length, total: totalCount })}
          </span>
          <Button
            variant="outline"
            onClick={copyLocation}
            disabled={!selected || !diagnosticLocationText(selected)}
          >
            <CrosshairIcon className="size-3.5" />
            {t(
              selected?.time != null || selected?.timePosition != null || selected?.line != null
                ? "ui.diagnostics.actions.copyLocation"
                : "ui.diagnostics.actions.copyPath",
            )}
          </Button>
          <Button className="diagnostics-copy-selected" onClick={copySelected} disabled={!selected}>
            <CopyIcon className="size-3.5" />
            {t("ui.diagnostics.actions.copySelected")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
