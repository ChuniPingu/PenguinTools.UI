import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DIAGNOSTIC_FILTERS,
  severityBadges,
  type SeverityFilter,
} from "@/components/diagnostics/diagnostics-shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DiagnosticsToolbar({
  filter,
  globalFilter,
  onFilterChange,
  onGlobalFilterChange,
  counts,
}: Readonly<{
  filter: SeverityFilter;
  globalFilter: string;
  onFilterChange: (value: SeverityFilter) => void;
  onGlobalFilterChange: (value: string) => void;
  counts: Record<SeverityFilter, number>;
}>) {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const showSearch = searchOpen || globalFilter.length > 0;

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const closeSearch = () => {
    onGlobalFilterChange("");
    setSearchOpen(false);
    searchToggleRef.current?.focus();
  };

  return (
    <div className="diagnostics-toolbar" data-search-open={showSearch || undefined}>
      <Tabs
        className="diagnostics-filters"
        value={filter}
        onValueChange={(value) => {
          onFilterChange(value as SeverityFilter);
        }}
      >
        <TabsList variant="line">
          {DIAGNOSTIC_FILTERS.map((item) => {
            const Icon = item.value === "All" ? null : severityBadges[item.value].icon;
            return (
              <TabsTrigger key={item.value} value={item.value} data-severity={item.value}>
                {Icon ? <Icon className="diagnostics-filter-icon" aria-hidden="true" /> : null}
                {t(item.labelKey)}
                <span className="text-muted-foreground tabular-nums">{counts[item.value]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <div
        className="diagnostics-search"
        data-open={showSearch || undefined}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !showSearch) return;
          event.preventDefault();
          event.stopPropagation();
          closeSearch();
        }}
      >
        {showSearch ? (
          <Input
            ref={searchRef}
            type="search"
            value={globalFilter}
            onChange={(event) => onGlobalFilterChange(event.target.value)}
            className="diagnostics-search-input"
            placeholder={t("ui.diagnostics.searchPlaceholder")}
            aria-label={t("ui.diagnostics.searchAriaLabel")}
          />
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          className="diagnostics-search-toggle"
          ref={searchToggleRef}
          aria-label={t(
            showSearch ? "ui.diagnostics.actions.closeSearch" : "ui.diagnostics.searchAriaLabel",
          )}
          aria-expanded={showSearch}
          onClick={() => (showSearch ? closeSearch() : setSearchOpen(true))}
        >
          {showSearch ? <XIcon /> : <SearchIcon />}
        </Button>
      </div>
    </div>
  );
}
