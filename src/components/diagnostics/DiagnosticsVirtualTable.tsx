import { flexRender, type ColumnDef, type Row, type Table } from "@tanstack/react-table";
import type { Virtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import type { DiagnosticRow } from "@/components/diagnostics/diagnostics-shared";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AppTableFeatures } from "@/lib/table-features";
import { cn } from "@/lib/utils";

const DIAGNOSTICS_TABLE_COLUMNS = (
  <colgroup>
    <col className="diagnostics-severity-col" />
    <col />
    <col className="diagnostics-file-col" />
    <col className="diagnostics-location-col" />
  </colgroup>
);

export function DiagnosticsVirtualTable({
  columns,
  onScrollElementChange,
  onSelectRow,
  paddingBottom,
  paddingTop,
  rowVirtualizer,
  selectedId,
  table,
  tableRows,
  virtualRows,
}: Readonly<{
  columns: ColumnDef<AppTableFeatures, DiagnosticRow>[];
  onScrollElementChange: (element: HTMLDivElement | null) => void;
  onSelectRow: (rowId: string) => void;
  paddingBottom: number;
  paddingTop: number;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  selectedId: string | null;
  table: Table<AppTableFeatures, DiagnosticRow>;
  tableRows: Row<AppTableFeatures, DiagnosticRow>[];
  virtualRows: ReturnType<Virtualizer<HTMLDivElement, Element>["getVirtualItems"]>;
}>) {
  const { t } = useTranslation();

  return (
    <div className="diagnostics-list flex h-full min-h-0 flex-col">
      <div className="diagnostics-list-header shrink-0 overflow-hidden">
        <table className="w-full table-fixed caption-bottom">
          {DIAGNOSTICS_TABLE_COLUMNS}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(header.column.id === "context" && "diagnostics-file-cell")}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
        </table>
      </div>
      <ScrollArea viewportRef={onScrollElementChange} className="min-h-0 flex-1">
        <table className="w-full table-fixed caption-bottom">
          {DIAGNOSTICS_TABLE_COLUMNS}
          <TableBody>
            {tableRows.length ? (
              <>
                {paddingTop > 0 ? (
                  <tr aria-hidden="true">
                    <td
                      className="hidden sm:table-cell"
                      colSpan={columns.length}
                      style={{ height: paddingTop, padding: 0, border: 0 }}
                    />
                    <td
                      className="sm:hidden"
                      colSpan={columns.length - 1}
                      style={{ height: paddingTop, padding: 0, border: 0 }}
                    />
                  </tr>
                ) : null}
                {virtualRows.map((virtualRow) => {
                  const row = tableRows[virtualRow.index];
                  const isSelected = selectedId === row.id;

                  return (
                    <TableRow
                      key={row.id}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      data-state={isSelected ? "selected" : undefined}
                      className="diagnostics-list-row cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-pressed={isSelected}
                      onClick={() => onSelectRow(row.id)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        onSelectRow(row.id);
                      }}
                    >
                      {row.getAllCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "whitespace-normal",
                            cell.column.id === "context" && "diagnostics-file-cell",
                            cell.column.id === "time" && "diagnostics-location-cell",
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                {paddingBottom > 0 ? (
                  <tr aria-hidden="true">
                    <td
                      className="hidden sm:table-cell"
                      colSpan={columns.length}
                      style={{ height: paddingBottom, padding: 0, border: 0 }}
                    />
                    <td
                      className="sm:hidden"
                      colSpan={columns.length - 1}
                      style={{ height: paddingBottom, padding: 0, border: 0 }}
                    />
                  </tr>
                ) : null}
              </>
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="hidden h-24 px-3 text-center text-muted-foreground sm:table-cell"
                >
                  {t("ui.diagnostics.noMatches")}
                </TableCell>
                <TableCell
                  colSpan={columns.length - 1}
                  className="h-24 px-3 text-center text-muted-foreground sm:hidden"
                >
                  {t("ui.diagnostics.noMatches")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </ScrollArea>
    </div>
  );
}
