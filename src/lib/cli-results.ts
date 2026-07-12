import type { CliDiagnosticPayload, CliResponse } from "@/lib/cli-types";
import { t } from "@/i18n";
import { normalizeSeverity } from "@/lib/diagnostics";
import { resolveMessage } from "@/lib/messages";

function countDiagnosticsBySeverity(diagnostics: CliDiagnosticPayload[]) {
  return diagnostics.reduce(
    (counts, item) => {
      counts[normalizeSeverity(item.severity)] += 1;
      return counts;
    },
    { Error: 0, Warning: 0, Information: 0 },
  );
}

export interface ChartSummary {
  mgxcId?: string | null;
  songId?: number | null;
  title: string;
  artist: string;
  designer: string;
  difficulty: string;
  level: number;
  mainBpm: number;
  filePath: string;
}

export interface ApplicationEntry {
  id: number;
  name: string;
  data?: string | null;
}

export interface ChartConversionMetadata {
  difficultyId: number;
  difficulty: string;
  bgmFilePath: string;
  fullBgmFilePath: string;
  bgmPreviewStart: number;
  bgmPreviewStop: number;
  bgmManualOffset: number;
  bgmEnableBarOffset: boolean;
  bgmInitialBpm: number;
  bgmInitialNumerator: number;
  bgmInitialDenominator: number;
  bgmBarOffset: number;
  bgmRealOffset: number;
  jacketFilePath: string;
  fullJacketFilePath: string;
  isCustomStage: boolean;
  stageId?: number | null;
  bgiFilePath: string;
  fullBgiFilePath: string;
  notesFieldLine: ApplicationEntry;
  stage: ApplicationEntry;
  genre?: ApplicationEntry;
  weTag?: ApplicationEntry;
  weDifficultyId?: number;
  weDifficulty?: string;
  sortName?: string;
  unlockEventId?: number | null;
  releaseDate?: string;
  mainTil?: number;
}

export interface ChartInspectData {
  inputPath: string;
  chart: ChartSummary;
  metadata: ChartConversionMetadata;
}

export interface OptionScanChart {
  difficulty: string;
  mgxcId: string | null;
  songId: number | null;
  title: string;
  artist: string;
  designer: string;
  level: number;
  mainBpm: number;
  mainTil: number;
  isMain: boolean;
  filePath: string;
  weTag: ApplicationEntry;
  weDifficultyId: number;
  weDifficulty: string;
  sortName: string;
  genre: ApplicationEntry;
  unlockEventId: number | null;
  releaseDate: string;
  jacketFilePath: string;
  bgmFilePath: string;
  bgmPreviewStart: number;
  bgmPreviewStop: number;
  bgmManualOffset: number;
  bgmRealOffset: number;
  bgmEnableBarOffset: boolean;
  bgmInitialBpm: number;
  bgmInitialNumerator: number;
  bgmInitialDenominator: number;
  isCustomStage: boolean;
  stageId: number | null;
  bgiFilePath: string;
  notesFieldLine: ApplicationEntry;
  stage: ApplicationEntry;
  diagnostics: CliDiagnosticPayload[];
}

export interface OptionScanConfig {
  optionName: string;
  optionId: string;
  convertChart: boolean;
  chartFileDiscovery: string[];
  convertAudio: boolean;
  convertJacket: boolean;
  convertBackground: boolean;
  hcaEncryptionKey: number;
  generateEventXml: boolean;
  generateReleaseTagXml: boolean;
  releaseTagId: number;
  releaseTagTitleName: string;
  ultimaEventId: number;
  weEventId: number;
  batchSize: number;
}

export interface OptionScanBook {
  songId: number | null;
  title: string;
  artist: string;
  mainDifficulty: string | null;
  sortName: string;
  genre: ApplicationEntry;
  unlockEventId: number | null;
  releaseDate: string;
  isCustomStage: boolean;
  stageId: number | null;
  bgiFilePath: string;
  notesFieldLine: ApplicationEntry;
  stage: ApplicationEntry;
  weTag: ApplicationEntry;
  weDifficultyId: number;
  weDifficulty: string;
  jacketFilePath: string;
  bgmFilePath: string;
  bgmPreviewStart: number;
  bgmPreviewStop: number;
  bgmManualOffset: number;
  bgmRealOffset: number;
  bgmEnableBarOffset: boolean;
  bgmInitialBpm: number;
  bgmInitialNumerator: number;
  bgmInitialDenominator: number;
  charts: OptionScanChart[];
}

export type OptionScanSelection =
  | { kind: "book"; bookIndex: number }
  | { kind: "chart"; bookIndex: number; chartIndex: number };

export interface CliInfoData {
  applicationName: string;
  version: string;
  buildDateUtc: string;
  baseDirectory: string;
  tempWorkPath: string;
  infrastructureAssetsPath: string;
}

export function parseCliInfoResult(response: CliResponse): CliInfoData | null {
  if (
    response.operation !== "info" ||
    !response.success ||
    response.data == null ||
    typeof response.data !== "object"
  ) {
    return null;
  }

  const data = response.data as Partial<CliInfoData>;
  if (!data.version || !data.buildDateUtc) return null;

  return {
    applicationName: data.applicationName ?? "PenguinTools.CLI",
    version: data.version,
    buildDateUtc: data.buildDateUtc,
    baseDirectory: data.baseDirectory ?? "",
    tempWorkPath: data.tempWorkPath ?? "",
    infrastructureAssetsPath: data.infrastructureAssetsPath ?? "",
  };
}

export function formatLocalTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatBuildTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const datePart = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return `${datePart} ${formatLocalTime(date)}`;
}

export function parseChartInspectResult(response: CliResponse): ChartSummary | null {
  if (!response.success || response.data == null || typeof response.data !== "object") return null;
  const chart = (response.data as { chart?: ChartSummary }).chart;
  return chart ?? null;
}

export function parseChartInspectData(response: CliResponse): ChartInspectData | null {
  if (!response.success || response.data == null || typeof response.data !== "object") return null;
  const data = response.data as Partial<ChartInspectData>;
  return data.chart && data.metadata ? (data as ChartInspectData) : null;
}

export function formatChartSummary(chart: ChartSummary): string {
  return [
    t("ui.song.preview.labels.song"),
    `${t("ui.song.preview.labels.title")}: ${chart.title}`,
    `${t("ui.song.preview.labels.artist")}: ${chart.artist}`,
    chart.songId != null ? `${t("ui.properties.songId.label")}: ${chart.songId}` : null,
    "",
    t("ui.song.preview.labels.chart"),
    `${t("ui.song.preview.labels.designer")}: ${chart.designer}`,
    `${t("ui.song.preview.labels.difficulty")}: ${chart.difficulty} ${chart.level}`,
    `${t("ui.song.preview.labels.displayBpm")}: ${chart.mainBpm}`,
    chart.mgxcId ? `${t("ui.song.preview.labels.mgxcId")}: ${chart.mgxcId}` : null,
    "",
    t("ui.song.preview.labels.details"),
    `${t("ui.song.preview.labels.file")}: ${chart.filePath}`,
  ]
    .filter((value) => value !== null)
    .join("\n");
}

export interface OptionScanResultData {
  books?: OptionScanBook[];
  configPath?: string | null;
  config?: OptionScanConfig | null;
  unmatchedDiagnostics?: CliDiagnosticPayload[];
}

export function parseOptionScanData(response: CliResponse): {
  books: OptionScanBook[];
  configPath: string | null;
  config: OptionScanConfig | null;
} {
  if (!response.success || response.data == null || typeof response.data !== "object") {
    return { books: [], configPath: null, config: null };
  }

  const data = response.data as OptionScanResultData;
  return {
    books: data.books ?? [],
    configPath: data.configPath ?? null,
    config: data.config ?? null,
  };
}

export function collectOptionChartFilePaths(books: OptionScanBook[]): string[] {
  return books.flatMap((book) => book.charts.map((chart) => chart.filePath));
}

export function formatFileChangedMessage(changedAt: Date): string {
  const time = formatLocalTime(changedAt);
  return t("ui.alerts.fileChanged", { time });
}

export function collectOptionScanDiagnostics(response: CliResponse): CliDiagnosticPayload[] {
  if (response.data == null || typeof response.data !== "object") {
    return response.diagnostics ?? [];
  }

  const data = response.data as OptionScanResultData;

  const fromCharts =
    data.books?.flatMap((book) => book.charts.flatMap((chart) => chart.diagnostics ?? [])) ?? [];
  const unmatched = data.unmatchedDiagnostics ?? [];
  const topLevel = response.diagnostics ?? [];

  return dedupeCliDiagnostics([...fromCharts, ...unmatched, ...topLevel]);
}

function dedupeCliDiagnostics(diagnostics: CliDiagnosticPayload[]): CliDiagnosticPayload[] {
  const seen = new Set<string>();
  const result: CliDiagnosticPayload[] = [];
  for (const item of diagnostics) {
    const key = [
      item.severity,
      item.message.key,
      JSON.stringify(item.message.args ?? null),
      item.path ?? "",
      item.line ?? "",
      item.time ?? "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function formatOptionScanPreview(
  books: OptionScanBook[],
  diagnostics: CliDiagnosticPayload[] = [],
): string {
  const lines: string[] = [];

  if (books.length === 0) {
    lines.push(t("ui.option.scan.noBooks"));
  } else {
    lines.push(
      books
        .map((book) => {
          const charts = book.charts
            .map((chart) => `  ${chart.difficulty} Lv.${chart.level} — ${chart.title}`)
            .join("\n");
          return `${book.title} (${book.artist})\n${charts}`;
        })
        .join("\n\n"),
    );
  }

  if (diagnostics.length > 0) {
    const counts = countDiagnosticsBySeverity(diagnostics);
    lines.push("");
    lines.push(
      t("ui.option.scan.diagnosticCounts", {
        warnings: counts.Warning,
        errors: counts.Error,
        info: counts.Information,
      }),
    );

    const previewItems = diagnostics
      .filter((item) => normalizeSeverity(item.severity) !== "Information")
      .slice(0, 12);

    if (previewItems.length > 0) {
      lines.push("");
      lines.push(t("ui.option.scan.notableIssues"));
      for (const item of previewItems) {
        const location = item.path ? ` (${item.path})` : "";
        lines.push(`- ${resolveMessage(item.message)}${location}`);
      }
      if (diagnostics.length > previewItems.length) {
        lines.push(
          t("ui.option.scan.moreIssues", {
            count: diagnostics.length - previewItems.length,
          }),
        );
      }
    }
  }

  return lines.join("\n");
}

export function summarizeCliDiagnostics(diagnostics: CliDiagnosticPayload[]): string | null {
  if (diagnostics.length === 0) return null;

  const counts = countDiagnosticsBySeverity(diagnostics);
  const parts: string[] = [];
  if (counts.Error > 0) parts.push(t("ui.cli.summary.errors", { count: counts.Error }));
  if (counts.Warning > 0) parts.push(t("ui.cli.summary.warnings", { count: counts.Warning }));
  if (counts.Information > 0) parts.push(t("ui.cli.summary.info", { count: counts.Information }));

  return parts.join(", ");
}
