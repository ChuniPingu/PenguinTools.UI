import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileChangedAlert } from "@/components/layout/FileChangedAlert";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { OptionSettings } from "@/components/export/OptionSettings";
import { OptionScanWorkspace } from "@/components/export/OptionScanWorkspace";
import { useApp } from "@/contexts/AppContext";
import { usePageTask } from "@/hooks/use-page-task";
import { useFileChangedReload } from "@/hooks/use-file-changed-reload";
import { useTrackedPathWatch } from "@/hooks/use-tracked-path-watch";
import {
  normalizeChartFileDiscovery,
  serializeChartFileDiscovery,
} from "@/lib/chart-file-discovery";
import { optionBuildArgs, optionScanArgs } from "@/lib/cli-commands";
import { pickOutputFolder } from "@/lib/file-picker";
import { getDirectory } from "@/lib/paths";
import { formatUnsignedIntegerString } from "@/lib/cli-json";
import { collectOptionChartFilePaths, parseOptionScanData } from "@/lib/cli-results";
import { optionBuildCanExecute } from "@/lib/export-settings";
import { useToolPageStore } from "@/stores/tool-page-store";

export function OptionPage() {
  const { t } = useTranslation();
  const { notifyError } = useApp();
  const query = usePageTask("option");
  const {
    run: runScan,
    runCommand,
    setSource,
    hasAttempted,
    busy: scanBusy,
    blocked: scanBlocked,
  } = query;
  const {
    optionPath,
    scannedPath,
    configPath,
    optionName,
    chartFileDiscovery,
    batchSize,
    hcaKey,
    ignoreCache,
    selectedReleaseTagId,
    customReleaseTagId,
    customReleaseTagTitleName,
    selectedGenreId,
    customGenreId,
    customGenreName,
    ultimaEventId,
    weEventId,
    exportSettings,
    books,
    selection,
    chartFilePaths,
    skippedChartCount,
  } = useToolPageStore((state) => state.option);
  const patchOption = useToolPageStore((state) => state.patchOption);
  useEffect(() => setSource(optionPath), [optionPath, setSource]);
  const chartFormatsDirty = useToolPageStore((state) => state.option.chartFormatsDirty);
  const scanPreviewOpen = useToolPageStore((state) => state.option.scanPreviewOpen);
  const setChartFormatsDirty = (chartFormatsDirty: boolean) => patchOption({ chartFormatsDirty });
  const setScanPreviewOpen = (scanPreviewOpen: boolean) => patchOption({ scanPreviewOpen });

  const canRun = optionPath.trim().length > 0;
  const settingsValid =
    isInteger(batchSize, -1) &&
    Number(batchSize) !== 0 &&
    isUnsignedInteger(selectedReleaseTagId) &&
    (!exportSettings.customReleaseTagXml || isUnsignedInteger(customReleaseTagId)) &&
    isUnsignedInteger(selectedGenreId) &&
    (!exportSettings.customGenre || isUnsignedInteger(customGenreId)) &&
    isUnsignedInteger(ultimaEventId) &&
    isUnsignedInteger(weEventId) &&
    isUnsignedBigInteger(hcaKey);
  const canBuild =
    canRun &&
    settingsValid &&
    optionBuildCanExecute(exportSettings) &&
    (configPath.trim().length > 0 || optionName.trim().length === 4);

  const chartCount = useMemo(
    () => books.reduce((count, book) => count + book.charts.length, 0),
    [books],
  );

  const buildSettings = {
    optionName: optionName.trim().length === 4 ? optionName.trim() : undefined,
    configPath: configPath.trim() || undefined,
    saveConfig: true,
    ...exportSettings,
    chartFileDiscovery,
    batchSize: Number(batchSize),
    hcaKey,
    ignoreCache,
    selectedReleaseTagId: Number(selectedReleaseTagId),
    customReleaseTagId: Number(customReleaseTagId),
    customReleaseTagTitleName,
    selectedGenreId: Number(selectedGenreId),
    customGenreId: Number(customGenreId),
    customGenreName,
    ultimaEventId: Number(ultimaEventId),
    weEventId: Number(weEventId),
  };

  const reloadOptionRef = useRef<() => void>(() => {});

  const { fileChangedAt, handleFileChanged, clearFileChanged } = useFileChangedReload({
    enabled: canRun,
    isBusy: scanBusy || scanBlocked,
    onReload: () => reloadOptionRef.current(),
  });

  const applyScanResult = useCallback(
    (response: Parameters<typeof parseOptionScanData>[0], loadConfig: boolean) => {
      const result = parseOptionScanData(response);
      if (!result) return false;
      const { books: scannedBooks, configPath: scannedConfigPath, config, skippedCharts } = result;
      patchOption({
        books: scannedBooks,
        selection: scannedBooks.length > 0 ? { kind: "book", bookIndex: 0 } : null,
        chartFilePaths: [
          ...new Set([
            ...collectOptionChartFilePaths(scannedBooks),
            ...skippedCharts.flatMap((chart) => (chart.path ? [chart.path] : [])),
          ]),
        ],
        skippedChartCount: skippedCharts.length,
        configPath: scannedConfigPath ?? "",
        ...(config && loadConfig
          ? {
              optionName: config.optionName,
              chartFileDiscovery: serializeChartFileDiscovery(
                normalizeChartFileDiscovery(config.chartFileDiscovery),
              ),
              batchSize: String(config.batchSize),
              hcaKey: formatUnsignedIntegerString(config.hcaEncryptionKey),
              selectedReleaseTagId: String(config.selectedReleaseTagId ?? 99),
              customReleaseTagId: String(config.customReleaseTagId ?? 99),
              customReleaseTagTitleName: config.customReleaseTagTitleName ?? "自制譜",
              selectedGenreId: String(config.selectedGenreId ?? 1000),
              customGenreId: String(config.customGenreId ?? 1000),
              customGenreName: config.customGenreName ?? "自制譜",
              ultimaEventId: String(config.ultimaEventId),
              weEventId: String(config.weEventId),
              exportSettings: {
                convertChart: config.convertChart,
                convertAudio: config.convertAudio,
                convertJacket: config.convertJacket,
                convertBackground: config.convertBackground,
                generateEventXml: config.generateEventXml,
                customReleaseTagXml: config.customReleaseTagXml,
                customGenre: config.customGenre ?? false,
                overrideChartGenre: config.overrideChartGenre ?? true,
              },
            }
          : {}),
      });
      patchOption({ scanPreviewOpen: true, ...(loadConfig ? { chartFormatsDirty: false } : {}) });
      clearFileChanged();
      return true;
    },
    [clearFileChanged, patchOption],
  );

  const scanOption = useCallback(
    (path?: string, force = true, saveConfig = false, preferFolderConfig = false) => {
      const trimmedPath = (path ?? optionPath).trim();
      if (!trimmedPath) {
        notifyError(t("ui.option.notify.missingFolder"));
        return;
      }

      if (scanBlocked || scanBusy) return;
      if (
        !force &&
        (useToolPageStore.getState().option.scannedPath === trimmedPath ||
          hasAttempted(trimmedPath))
      )
        return;
      const optionState = useToolPageStore.getState().option;
      const settings = preferFolderConfig
        ? {}
        : {
            chartFileDiscovery: optionState.chartFileDiscovery,
            batchSize: Number(optionState.batchSize),
          };
      const onResult = (response: Parameters<typeof parseOptionScanData>[0]) => {
        if (useToolPageStore.getState().option.optionPath.trim() !== trimmedPath) return;
        if (applyScanResult(response, preferFolderConfig || saveConfig))
          patchOption({ scannedPath: trimmedPath });
      };
      if (saveConfig) {
        void runCommand(optionScanArgs(trimmedPath, { ...settings, saveConfig: true }), onResult);
      } else {
        void runScan({ kind: "optionScan", path: trimmedPath, ...settings }, onResult);
      }
    },
    [
      scanBusy,
      hasAttempted,
      applyScanResult,
      notifyError,
      optionPath,
      patchOption,
      runCommand,
      runScan,
      scanBlocked,
      t,
    ],
  );

  const reloadOption = useCallback(() => {
    scanOption();
  }, [scanOption]);

  useEffect(() => {
    reloadOptionRef.current = reloadOption;
  }, [reloadOption]);

  useEffect(() => {
    const trimmedPath = optionPath.trim();
    if (!trimmedPath) {
      patchOption({
        scannedPath: "",
        books: [],
        selection: null,
        chartFilePaths: [],
        skippedChartCount: 0,
        configPath: "",
      });
      clearFileChanged();
      patchOption({ scanPreviewOpen: false });
      return;
    }

    if (scanBlocked || scanBusy || trimmedPath === scannedPath) return;
    scanOption(trimmedPath, false, false, true);
  }, [scanBlocked, scanBusy, clearFileChanged, optionPath, patchOption, scannedPath, scanOption]);

  useTrackedPathWatch(optionPath, chartFilePaths, handleFileChanged);

  const handleBuild = async () => {
    if (!canRun) {
      notifyError(t("ui.option.notify.missingFolder"));
      return;
    }

    if (!canBuild) {
      if (!optionBuildCanExecute(exportSettings)) {
        notifyError(t("ui.option.notify.noop"));
        return;
      }
      notifyError(t("ui.option.notify.missingNameOrConfig"));
      return;
    }

    const output = await pickOutputFolder("export.option.output", getDirectory(optionPath));
    if (!output) return;

    void runCommand(optionBuildArgs(optionPath, output, buildSettings));
  };

  return (
    <ToolPageShell
      task={query}
      primaryLabel={t("ui.option.convert")}
      reloadDisabled={!canRun}
      primaryDisabled={!canBuild}
      onReload={reloadOption}
      onPrimary={() => void handleBuild()}
      bottomPanel={
        <OptionScanWorkspace
          books={books}
          chartCount={chartCount}
          hasSource={canRun}
          open={scanPreviewOpen}
          onOpenChange={setScanPreviewOpen}
          selection={selection}
          onSelect={(next) => patchOption({ selection: next })}
        />
      }
    >
      <WorkspaceSection title={t("ui.option.source")}>
        <FileFolderPicker
          historyKey="export.option.input"
          label={t("ui.option.folder")}
          value={optionPath}
          mode="folder"
          onChange={(value) => patchOption({ optionPath: value })}
        />
        <FileChangedAlert changedAt={fileChangedAt} className="mt-3" />
        {skippedChartCount > 0 ? (
          <Alert className="mt-3">
            <AlertDescription>
              {t("ui.option.partialScan", { count: skippedChartCount })}
            </AlertDescription>
          </Alert>
        ) : null}
      </WorkspaceSection>

      <OptionSettings
        chartFormatsDirty={chartFormatsDirty}
        reloadDisabled={scanBusy || scanBlocked}
        onChartFormatsChange={(value) => {
          patchOption({ chartFileDiscovery: value });
          setChartFormatsDirty(true);
        }}
        onSaveAndReload={() => scanOption(undefined, true, true)}
      />
    </ToolPageShell>
  );
}

function isInteger(value: string, minimum: number): boolean {
  return /^-?\d+$/.test(value.trim()) && Number(value) >= minimum;
}

function isUnsignedInteger(value: string): boolean {
  return /^\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value));
}

function isUnsignedBigInteger(value: string): boolean {
  if (!/^\d+$/.test(value.trim())) return false;
  try {
    return BigInt(value) <= 18_446_744_073_709_551_615n;
  } catch {
    return false;
  }
}
