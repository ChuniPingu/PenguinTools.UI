import { useTranslation } from "react-i18next";
import { ChevronRightIcon } from "lucide-react";
import { toDiagnosticPayload, type DiagnosticRow } from "./diagnostics-shared";
import { getDiagnosticDetails, noteLanes, noteName } from "./diagnostic-details";
import { DiagnosticPosition } from "./DiagnosticPosition";
import { DiagnosticSeverity } from "./DiagnosticSeverity";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DiagnosticsDetailView({ selected }: Readonly<{ selected: DiagnosticRow | null }>) {
  const { t } = useTranslation();
  if (!selected)
    return (
      <p className="p-5 text-sm text-muted-foreground">{t("ui.diagnostics.emptySelection")}</p>
    );
  const details = getDiagnosticDetails(selected);
  const isSegment = !!details.isSegment;
  const hasOutputTimeline = details.notes.some((n) => n.outputTimeline != null);
  const hasLocation =
    selected.time != null || selected.timePosition != null || selected.line != null;

  return (
    <ScrollArea key={selected.id} className="diagnostics-detail h-full">
      <section className="diagnostics-detail-content" aria-label={t("ui.diagnostics.detailLabel")}>
        <header>
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <DiagnosticSeverity severity={selected.severity} />
            {details.stage && (
              <>
                <span aria-hidden="true">/</span>
                <span>{details.stage}</span>
              </>
            )}
          </div>
          <h3 className="text-lg font-semibold leading-snug break-words">{details.title}</h3>
          {selected.path && (
            <p className="mt-1.5 text-xs break-all text-muted-foreground" data-diagnostic-path>
              {selected.path}
            </p>
          )}
        </header>
        {details.notes.length > 0 && (
          <Table className="[&_thead_th]:h-8">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-muted-foreground">
                  {t(`ui.diagnostics.detail.${isSegment ? "endpoint" : "object"}`)}
                </TableHead>
                {isSegment && (
                  <TableHead className="text-muted-foreground">
                    {t("ui.diagnostics.detail.sourcePosition")}
                  </TableHead>
                )}
                <TableHead className="text-muted-foreground">
                  {t("ui.diagnostics.detail.lane")}
                </TableHead>
                {!isSegment && (
                  <TableHead className="text-muted-foreground">
                    {t("ui.diagnostics.detail.timeline")}
                  </TableHead>
                )}
                {hasOutputTimeline && (
                  <TableHead className="text-muted-foreground">
                    {t("ui.diagnostics.detail.outputTimeline")}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.notes.map((n, index) => (
                <TableRow key={`${index}:${n.type}:${n.tick}`} className="hover:bg-transparent">
                  <TableCell className="pl-0">
                    {n.endpoint ? t(`ui.diagnostics.detail.${n.endpoint}`) : noteName(n.type)}
                    {!isSegment && (
                      <div className="mt-1 text-muted-foreground">
                        <DiagnosticPosition
                          diagnostic={{ time: n.tick, timePosition: n.timePosition }}
                        />
                      </div>
                    )}
                  </TableCell>
                  {isSegment && (
                    <TableCell>
                      <DiagnosticPosition
                        diagnostic={{ time: n.tick, timePosition: n.timePosition }}
                      />
                    </TableCell>
                  )}
                  <TableCell className="tabular-nums">{noteLanes(n)}</TableCell>
                  {!isSegment && (
                    <TableCell className="font-mono">
                      {n.timeline < 0 ? t("ui.common.emptyValue") : `TIL ${n.timeline}`}
                    </TableCell>
                  )}
                  {hasOutputTimeline && (
                    <TableCell
                      className={
                        n.outputTimeline !== n.timeline ? "font-mono font-semibold" : "font-mono"
                      }
                    >
                      {n.outputTimeline == null
                        ? t("ui.common.emptyValue")
                        : `TIL ${n.outputTimeline}`}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {details.source != null && (
          <div className="diagnostics-source flex gap-3 border py-2 font-mono text-xs leading-relaxed">
            <span
              className="shrink-0 border-r px-3 text-muted-foreground"
              aria-label={t("ui.diagnostics.line", { line: selected.line })}
            >
              {selected.line}
            </span>
            <pre className="min-w-0 pr-2 break-words whitespace-pre-wrap">
              <code>{details.source}</code>
            </pre>
          </div>
        )}
        {(details.properties.length > 0 ||
          (hasLocation &&
            details.source == null &&
            (!details.notes.length || selected.line != null))) && (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-xs">
            {!details.notes.length &&
              details.source == null &&
              (selected.time != null || selected.timePosition != null) && (
                <>
                  <dt className="text-muted-foreground">
                    {t("ui.diagnostics.detail.sourcePosition")}
                  </dt>
                  <dd>
                    <DiagnosticPosition diagnostic={selected} />
                  </dd>
                </>
              )}
            {selected.line != null && details.source == null && (
              <>
                <dt className="text-muted-foreground">{t("ui.diagnostics.detail.sourceLine")}</dt>
                <dd>{t("ui.diagnostics.line", { line: selected.line })}</dd>
              </>
            )}
            {details.properties.map((p) => (
              <Property key={p.label} label={p.label} value={p.value} />
            ))}
          </dl>
        )}
        {details.description && (
          <p className="diagnostics-explanation leading-relaxed break-words">
            {details.description}
          </p>
        )}
        <Collapsible key={selected.id}>
          <div className="diagnostics-technical-actions">
            <CollapsibleTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="group h-auto p-0 text-xs text-muted-foreground"
                />
              }
            >
              {t("ui.diagnostics.actions.technical")}
              <ChevronRightIcon className="size-3.5 rotate-90 group-data-open:-rotate-90" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <pre className="mt-2 border-t pt-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
              {JSON.stringify(toDiagnosticPayload(selected), null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </section>
    </ScrollArea>
  );
}

function Property({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </>
  );
}
