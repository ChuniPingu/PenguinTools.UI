import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import {
  flexRender,
  sortFn_basic,
  useTable,
  type ColumnDef,
  type SortingState,
  type Table,
} from "@tanstack/react-table";
import { appTableFeatures, type AppTableFeatures } from "@/lib/table-features";
import { AssetUsageHelp } from "@/components/assets/AssetUsageHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApp } from "@/contexts/AppContext";
import { useAssetCatalog } from "@/contexts/AssetCatalogContext";
import type { AssetCatalog } from "@/lib/asset-catalog";
import {
  ASSET_CATEGORIES,
  assetPagePath,
  formatAssetMetaDirective,
  isAssetCategory,
  type AssetMetaKind,
} from "@/lib/asset-meta";
import type { ApplicationEntry } from "@/lib/cli-results";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 41;

const ASSETS_TABLE_COLUMNS = (
  <colgroup>
    <col className="w-28" />
    <col />
    <col className="w-12" />
  </colgroup>
);

function entriesForCategory(catalog: AssetCatalog, category: AssetMetaKind): ApplicationEntry[] {
  switch (category) {
    case "genre":
      return catalog.genreNames;
    case "fieldLine":
      return catalog.fieldLines;
    case "stage":
      return catalog.stageNames;
    case "weTag":
      return catalog.weTagNames;
  }
}

function SortHeader({
  label,
  sorted,
  onToggle,
}: Readonly<{
  label: string;
  sorted: false | "asc" | "desc";
  onToggle: () => void;
}>) {
  const sortedIcon = sorted === "asc" ? ArrowUpIcon : ArrowDownIcon;
  const Icon = sorted ? sortedIcon : ArrowUpDownIcon;

  return (
    <Button variant="ghost" size="sm" className="-ml-2.5 h-7 px-2.5" onClick={onToggle}>
      {label}
      <Icon data-icon="inline-end" />
    </Button>
  );
}

export function AssetsPage() {
  const { tab } = useParams<{ tab: string }>();

  if (!isAssetCategory(tab)) {
    return <Navigate to={assetPagePath()} replace />;
  }

  return <AssetsPageContent category={tab} />;
}

function createAssetColumns(
  t: import("i18next").TFunction,
  copyMeta: (entry: ApplicationEntry) => Promise<void>,
): ColumnDef<AppTableFeatures, ApplicationEntry>[] {
  return [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <SortHeader
          label={t("ui.assets.columns.id")}
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-muted-foreground">{row.original.id}</span>
      ),
      sortFn: sortFn_basic,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortHeader
          label={t("ui.assets.columns.name")}
          sorted={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => row.original.name,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">{t("ui.assets.columns.actions")}</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="pe-2.5"
                onClick={() => void copyMeta(row.original)}
                aria-label={t("ui.assets.actions.copyMeta")}
              >
                <CopyIcon />
              </Button>
            }
          />
          <TooltipContent side="top">{t("ui.assets.actions.copyMeta")}</TooltipContent>
        </Tooltip>
      ),
    },
  ];
}

function AssetsTable({
  table,
  category,
  globalFilter,
  sorting,
  isLoading,
  totalEntries,
}: Readonly<{
  table: Table<AppTableFeatures, ApplicationEntry>;
  category: AssetMetaKind;
  globalFilter: string;
  sorting: SortingState;
  isLoading: boolean;
  totalEntries: number;
}>) {
  const { t } = useTranslation();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  useEffect(() => {
    tableContainerRef.current?.scrollTo({ top: 0 });
  }, [category, globalFilter, sorting]);

  if (isLoading && totalEntries === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
        <Spinner />
        {t("ui.assets.loading")}
      </div>
    );
  }
  if (totalEntries === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-8 text-sm text-muted-foreground">
        <p>{t("ui.assets.emptyCatalog")}</p>
        <Button variant="outline" size="sm" className="w-fit" render={<Link to="/misc" />}>
          {t("ui.assets.emptyCatalogAction")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 overflow-hidden">
        <table className="w-full table-fixed caption-bottom text-xs">
          {ASSETS_TABLE_COLUMNS}
          <TableHeader className="bg-muted/80 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.id === "id" && "w-28",
                      header.column.id === "actions" && "w-12",
                      "px-4",
                    )}
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
      <ScrollArea viewportRef={tableContainerRef} className="min-h-0 flex-1">
        <table className="w-full table-fixed caption-bottom text-xs">
          {ASSETS_TABLE_COLUMNS}
          <TableBody>
            {rows.length ? (
              <>
                {paddingTop > 0 ? (
                  <tr aria-hidden="true">
                    <td
                      colSpan={table.getAllLeafColumns().length}
                      style={{ height: paddingTop, padding: 0, border: 0 }}
                    />
                  </tr>
                ) : null}
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <TableRow key={row.id} data-index={virtualRow.index}>
                      {row.getAllCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                {paddingBottom > 0 ? (
                  <tr aria-hidden="true">
                    <td
                      colSpan={table.getAllLeafColumns().length}
                      style={{ height: paddingBottom, padding: 0, border: 0 }}
                    />
                  </tr>
                ) : null}
              </>
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={table.getAllLeafColumns().length}
                  className="h-24 px-4 text-center text-muted-foreground"
                >
                  {t("ui.assets.noMatches")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </ScrollArea>
    </div>
  );
}

function AssetsPageContent({ category }: Readonly<{ category: AssetMetaKind }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useApp();
  const { catalog, isLoading, refresh } = useAssetCatalog();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "id", desc: false }]);

  const data = useMemo(() => entriesForCategory(catalog, category), [catalog, category]);

  const copyMeta = useCallback(
    async (entry: ApplicationEntry) => {
      const text = formatAssetMetaDirective(category, entry);
      try {
        await navigator.clipboard.writeText(text);
        notifySuccess(t("ui.assets.notify.copied"));
      } catch (error) {
        notifyError(error instanceof Error ? error.message : String(error));
      }
    },
    [category, notifyError, notifySuccess, t],
  );

  const columns = useMemo(() => createAssetColumns(t, copyMeta), [copyMeta, t]);

  const table = useTable({
    features: appTableFeatures,
    data,
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
      const entry = row.original;
      return `${entry.id} ${entry.name} ${entry.data ?? ""}`.toLowerCase().includes(query);
    },
    getRowId: (row) => `${row.id}:${row.name}`,
  });

  const rows = table.getRowModel().rows;

  const totalEntries =
    catalog.genreNames.length +
    catalog.fieldLines.length +
    catalog.stageNames.length +
    catalog.weTagNames.length;
  const isEmptyCatalog = !isLoading && totalEntries === 0;
  const filteredCount = rows.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b bg-muted/35">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2">
          <Tabs
            value={category}
            onValueChange={(value) => {
              if (isAssetCategory(value)) {
                void navigate(assetPagePath(value));
              }
            }}
          >
            <TabsList>
              {ASSET_CATEGORIES.map((item) => (
                <TabsTrigger key={item} value={item}>
                  {t(`ui.assets.tabs.${item}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <AssetUsageHelp />

          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={isLoading}
            onClick={() => void refresh()}
          >
            <RefreshCwIcon data-icon="inline-start" className={cn(isLoading && "animate-spin")} />
            {t("ui.assets.actions.refresh")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t px-4 py-2">
          <Input
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-xs"
            placeholder={t("ui.assets.searchPlaceholder")}
            aria-label={t("ui.assets.searchAriaLabel")}
            disabled={isEmptyCatalog}
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("ui.assets.countSummary", {
              shown: filteredCount,
              total: data.length,
            })}
          </span>
        </div>
      </div>

      <AssetsTable
        table={table}
        category={category}
        globalFilter={globalFilter}
        sorting={sorting}
        isLoading={isLoading}
        totalEntries={totalEntries}
      />
    </div>
  );
}
