import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircleIcon, AlertTriangleIcon, CopyIcon, InfoIcon } from "lucide-react";
import type { CliDiagnosticPayload } from "@/lib/cli-types";
import { normalizeSeverity, type NormalizedSeverity } from "@/lib/diagnostics";
import { formatDiagnosticLocation, resolveMessage } from "@/lib/messages";
import { Badge, type badgeVariants } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type SeverityFilter = "All" | NormalizedSeverity;

const DIAGNOSTIC_FILTERS: Array<{
  value: SeverityFilter;
  labelKey:
    | "ui.diagnostics.filters.all"
    | "ui.diagnostics.filters.error"
    | "ui.diagnostics.filters.warning"
    | "ui.diagnostics.filters.information";
}> = [
  { value: "All", labelKey: "ui.diagnostics.filters.all" },
  { value: "Error", labelKey: "ui.diagnostics.filters.error" },
  { value: "Warning", labelKey: "ui.diagnostics.filters.warning" },
  { value: "Information", labelKey: "ui.diagnostics.filters.information" },
];

const SEVERITY_LABEL_KEYS: Record<
  NormalizedSeverity,
  | "ui.diagnostics.filters.error"
  | "ui.diagnostics.filters.warning"
  | "ui.diagnostics.filters.information"
> = {
  Error: "ui.diagnostics.filters.error",
  Warning: "ui.diagnostics.filters.warning",
  Information: "ui.diagnostics.filters.information",
};

async function copyDiagnosticText(text: string) {
  await navigator.clipboard.writeText(text);
}

const severityBadges: Record<
  NormalizedSeverity,
  { variant: NonNullable<VariantProps<typeof badgeVariants>["variant"]>; icon: typeof InfoIcon }
> = {
  Error: { variant: "destructive", icon: AlertCircleIcon },
  Warning: { variant: "outline", icon: AlertTriangleIcon },
  Information: { variant: "secondary", icon: InfoIcon },
};

interface DiagnosticsPanelProps {
  open: boolean;
  diagnostics: CliDiagnosticPayload[];
  onClose: () => void;
}

export function DiagnosticsPanel({ open, diagnostics, onClose }: DiagnosticsPanelProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<SeverityFilter>("All");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (filter === "All") return diagnostics;
    return diagnostics.filter((item) => normalizeSeverity(item.severity) === filter);
  }, [diagnostics, filter]);

  const selected = filtered[selectedIndex] ?? filtered[0];

  const copySelected = () => {
    if (!selected) return;
    void copyDiagnosticText(JSON.stringify(selected, null, 2));
  };

  const copyAll = () => {
    void copyDiagnosticText(JSON.stringify(filtered, null, 2));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex h-[min(80vh,720px)] max-w-4xl flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("ui.diagnostics.title")}</DialogTitle>
        </DialogHeader>

        <DialogBody className="min-h-0 flex-1 gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={filter}
              onValueChange={(value) => {
                setFilter(value as SeverityFilter);
                setSelectedIndex(0);
              }}
            >
              <TabsList>
                {DIAGNOSTIC_FILTERS.map((item) => (
                  <TabsTrigger key={item.value} value={item.value}>
                    {t(item.labelKey)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <span className="ml-auto text-xs text-muted-foreground">
              {t("ui.diagnostics.countSummary", {
                shown: filtered.length,
                total: diagnostics.length,
              })}
            </span>
          </div>

          <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1 rounded-lg border">
            <ResizablePanel defaultSize={55} minSize={30}>
              <ScrollArea className="h-full">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr className="border-b text-left">
                      <th className="px-3 py-2 font-medium">
                        {t("ui.diagnostics.table.severity")}
                      </th>
                      <th className="px-3 py-2 font-medium">{t("ui.diagnostics.table.message")}</th>
                      <th className="px-3 py-2 font-medium">{t("ui.diagnostics.table.context")}</th>
                      <th className="px-3 py-2 font-medium">{t("ui.diagnostics.table.time")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, index) => {
                      const severity = normalizeSeverity(item.severity);
                      const badge = severityBadges[severity];
                      const Icon = badge.icon;
                      const isSelected = selected === item;

                      return (
                        <tr
                          key={`${item.message.key}-${item.path ?? ""}-${item.line ?? ""}-${item.time ?? ""}`}
                          className={cn(
                            "cursor-pointer border-b hover:bg-muted/50",
                            isSelected && "bg-muted",
                          )}
                          tabIndex={0}
                          role="button"
                          onClick={() => setSelectedIndex(index)}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            setSelectedIndex(index);
                          }}
                        >
                          <td className="px-3 py-2">
                            <Badge variant={badge.variant}>
                              <Icon />
                              {t(SEVERITY_LABEL_KEYS[severity])}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{resolveMessage(item.message)}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDiagnosticLocation(item.path, item.line)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {item.time ?? t("ui.common.emptyValue")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={45} minSize={20}>
              <ScrollArea className="h-full">
                <pre className="p-4 font-mono text-xs leading-relaxed">
                  {selected
                    ? JSON.stringify(selected, null, 2)
                    : t("ui.diagnostics.emptySelection")}
                </pre>
              </ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={copySelected} disabled={!selected}>
            <CopyIcon className="size-4" />
            {t("ui.diagnostics.actions.copySelected")}
          </Button>
          <Button variant="outline" onClick={copyAll} disabled={filtered.length === 0}>
            <CopyIcon className="size-4" />
            {t("ui.diagnostics.actions.copyAll")}
          </Button>
          <Button onClick={onClose}>{t("ui.common.actions.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
