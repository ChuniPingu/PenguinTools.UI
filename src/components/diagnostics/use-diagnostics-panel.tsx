import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { appTableFeatures, type AppTableFeatures } from "@/lib/table-features";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DiagnosticPosition } from "./DiagnosticPosition";
import { DiagnosticSeverity } from "./DiagnosticSeverity";
import {
  diagnosticFileName,
  diagnosticLocationText,
  getDiagnosticDetails,
} from "./diagnostic-details";
import type { CliDiagnosticPayload } from "@/lib/cli-types";
import { normalizeSeverity } from "@/lib/diagnostics";
import { formatDiagnosticLocation, formatDiagnosticTime, resolveMessage } from "@/lib/messages";
import {
  copyDiagnosticText,
  ROW_HEIGHT,
  SEVERITY_SORT_ORDER,
  toDiagnosticPayload,
  type DiagnosticRow,
  type SeverityFilter,
} from "@/components/diagnostics/diagnostics-shared";
import { DiagnosticsSortHeader } from "@/components/diagnostics/DiagnosticsSortHeader";
import { DiagnosticMessage } from "@/components/diagnostics/DiagnosticMessage";

export function useDiagnosticsPanel(
  diagnostics: CliDiagnosticPayload[],
  open: boolean,
  onNavigate: () => void,
) {
  const { t } = useTranslation();
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<SeverityFilter>("All");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "severity", desc: false }]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo<DiagnosticRow[]>(
    () =>
      diagnostics.map((item, index) => ({
        ...item,
        id: `${index}:${item.message.key}:${item.path ?? ""}:${item.line ?? ""}:${item.time ?? ""}`,
      })),
    [diagnostics],
  );

  const severityFiltered = useMemo(() => {
    if (filter === "All") return rows;
    return rows.filter((item) => normalizeSeverity(item.severity) === filter);
  }, [filter, rows]);

  const counts = useMemo(() => {
    const result = { All: rows.length, Error: 0, Warning: 0, Information: 0 };
    for (const row of rows) result[normalizeSeverity(row.severity)]++;
    return result;
  }, [rows]);

  const columns = useMemo<ColumnDef<AppTableFeatures, DiagnosticRow>[]>(
    () => [
      {
        id: "severity",
        accessorFn: (row) => normalizeSeverity(row.severity),
        header: ({ column }) => (
          <DiagnosticsSortHeader
            label={t("ui.diagnostics.table.severity")}
            compact
            sorted={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => <DiagnosticSeverity severity={row.original.severity} compact />,
        sortFn: (a, b) =>
          SEVERITY_SORT_ORDER[normalizeSeverity(a.original.severity)] -
          SEVERITY_SORT_ORDER[normalizeSeverity(b.original.severity)],
        size: 120,
      },
      {
        id: "message",
        accessorFn: (row) => getDiagnosticDetails(row).title,
        header: ({ column }) => (
          <DiagnosticsSortHeader
            label={t("ui.diagnostics.table.message")}
            sorted={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <DiagnosticMessage
            message={row.original.message}
            label={getDiagnosticDetails(row.original).title}
            onNavigate={onNavigate}
          />
        ),
      },
      {
        id: "context",
        accessorFn: (row) => row.path ?? "",
        header: ({ column }) => (
          <DiagnosticsSortHeader
            label={t("ui.diagnostics.table.context")}
            sorted={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: (info) => {
          const value = info.getValue<string>();
          return value ? (
            <Tooltip>
              <TooltipTrigger
                className="block max-w-full truncate text-left text-muted-foreground"
                aria-label={value}
              >
                {diagnosticFileName(value)}
              </TooltipTrigger>
              <TooltipContent className="break-all">{value}</TooltipContent>
            </Tooltip>
          ) : (
            <span>{t("ui.common.emptyValue")}</span>
          );
        },
      },
      {
        id: "time",
        accessorFn: (row) =>
          formatDiagnosticTime(row) ||
          (row.line == null ? "" : t("ui.diagnostics.line", { line: row.line })),
        header: ({ column }) => (
          <DiagnosticsSortHeader
            label={t("ui.diagnostics.table.time")}
            sorted={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <DiagnosticPosition diagnostic={row.original} className="text-muted-foreground" />
        ),
        sortFn: (a, b) => {
          const left = a.original.time ?? a.original.line;
          const right = b.original.time ?? b.original.line;
          if (left == null && right == null) return 0;
          if (left == null) return 1;
          if (right == null) return -1;
          return left - right;
        },
        size: 160,
      },
    ],
    [t, onNavigate],
  );

  const table = useTable({
    features: appTableFeatures,
    data: severityFiltered,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).trim().toLowerCase();
      if (!query) return true;
      const item = row.original;
      const haystack = [
        resolveMessage(item.message),
        getDiagnosticDetails(item).title,
        diagnosticLocationText(item),
        formatDiagnosticLocation(item.path, item.line),
        formatDiagnosticTime(item),
        item.time == null ? "" : String(item.time),
        normalizeSeverity(item.severity),
        item.message.key,
        item.target == null ? "" : JSON.stringify(item.target),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    },
    getRowId: (row) => row.id,
  });

  const tableRows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: open ? tableRows.length : 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  const selected =
    tableRows.find((row) => row.id === selectedId)?.original ?? tableRows[0]?.original ?? null;

  useLayoutEffect(() => {
    if (!open || !scrollElement) return;
    rowVirtualizer.measure();
  }, [open, scrollElement, tableRows.length, rowVirtualizer]);

  useEffect(() => {
    scrollElement?.scrollTo({ top: 0 });
  }, [filter, globalFilter, sorting, scrollElement]);

  const copy = async (text: string) => {
    try {
      await copyDiagnosticText(text);
      toast.success(t("ui.diagnostics.notify.copied"));
    } catch {
      toast.error(t("ui.diagnostics.notify.copyFailed"));
    }
  };

  const copyLocation = () => {
    if (selected) void copy(diagnosticLocationText(selected));
  };

  const copySelected = () => {
    if (!selected) return;
    void copy(JSON.stringify(toDiagnosticPayload(selected), null, 2));
  };

  return {
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
    totalCount: diagnostics.length,
    virtualRows,
  };
}
