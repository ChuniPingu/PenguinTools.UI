import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileChangedAlert } from "@/components/layout/FileChangedAlert";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { OptionSettings } from "@/components/export/OptionSettings";
import { OptionScanWorkspace } from "@/components/export/OptionScanWorkspace";
import { useApp } from "@/contexts/AppContext";
import { useFileChangedReload } from "@/hooks/use-file-changed-reload";
import { useTrackedPathWatch } from "@/hooks/use-tracked-path-watch";
import {
  normalizeChartFileDiscovery,
  serializeChartFileDiscovery,
} from "@/lib/chart-file-discovery";
import { optionBuildArgs, optionScanArgs } from "@/lib/cli-commands";
import { pickOutputFolder } from "@/lib/file-picker";
import { getDirectory } from "@/lib/paths";
import { collectOptionChartFilePaths, parseOptionScanData } from "@/lib/cli-results";
import { optionBuildCanExecute } from "@/lib/export-settings";
import { useToolPageStore } from "@/stores/tool-page-store";

export function OptionPage() {
  const { t } = useTranslation();
  const { runCliCommand, notifyError, isBusy } = useApp();
  const {
    optionPath,
    scannedPath,
    configPath,
    optionName,
    chartFileDiscovery,
    batchSize,
    hcaKey,
    releaseTagId,
    releaseTagTitleName,
    ultimaEventId,
    weEventId,
    exportSettings,
    books,
    selection,
    chartFilePaths,
  } = useToolPageStore((state) => state.option);
  const patchOption = useToolPageStore((state) => state.patchOption);
  const [chartFormatsDirty, setChartFormatsDirty] = useState(false);
  const [scanPreviewOpen, setScanPreviewOpen] = useState(false);

  const canRun = optionPath.trim().length > 0;
  const settingsValid =
    isInteger(batchSize, -1) &&
    Number(batchSize) !== 0 &&
    isUnsignedInteger(releaseTagId) &&
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
    releaseTagId: Number(releaseTagId),
    releaseTagTitleName,
    ultimaEventId: Number(ultimaEventId),
    weEventId: Number(weEventId),
  };

  const reloadOptionRef = useRef<() => void>(() => {});

  const { fileChangedAt, handleFileChanged, clearFileChanged } = useFileChangedReload({
    enabled: canRun,
    isBusy,
    onReload: () => reloadOptionRef.current(),
  });

  const applyScanResult = useCallback(
    (response: Parameters<typeof parseOptionScanData>[0]) => {
      if (!response.success) return;
      const {
        books: scannedBooks,
        configPath: scannedConfigPath,
        config,
      } = parseOptionScanData(response);
      patchOption({
        books: scannedBooks,
        selection: scannedBooks.length > 0 ? { kind: "book", bookIndex: 0 } : null,
        chartFilePaths: collectOptionChartFilePaths(scannedBooks),
        configPath: scannedConfigPath ?? "",
        ...(config
          ? {
              optionName: config.optionName,
              chartFileDiscovery: serializeChartFileDiscovery(
                normalizeChartFileDiscovery(config.chartFileDiscovery),
              ),
              batchSize: String(config.batchSize),
              hcaKey: String(config.hcaEncryptionKey),
              releaseTagId: String(config.releaseTagId),
              releaseTagTitleName: config.releaseTagTitleName,
              ultimaEventId: String(config.ultimaEventId),
              weEventId: String(config.weEventId),
              exportSettings: {
                convertChart: config.convertChart,
                convertAudio: config.convertAudio,
                convertJacket: config.convertJacket,
                convertBackground: config.convertBackground,
                generateEventXml: config.generateEventXml,
                generateReleaseTagXml: config.generateReleaseTagXml,
              },
            }
          : {}),
      });
      setChartFormatsDirty(false);
      setScanPreviewOpen(true);
      clearFileChanged();
    },
    [clearFileChanged, patchOption],
  );

  const scanOption = useCallback(
    (path?: string, force = true, saveConfig = false, preferFolderConfig = false) => {
      const trimmedPath = (path ?? optionPath).trim();
      if (!trimmedPath) {
        notifyError(t("ui.option.errors.missingFolder"));
        return;
      }

      if (!force && useToolPageStore.getState().option.scannedPath === trimmedPath) return;
      patchOption({ scannedPath: trimmedPath });
      const optionState = useToolPageStore.getState().option;
      void runCliCommand(
        optionScanArgs(
          trimmedPath,
          preferFolderConfig
            ? { saveConfig }
            : {
                chartFileDiscovery: optionState.chartFileDiscovery,
                batchSize: Number(optionState.batchSize),
                saveConfig,
              },
        ),
        applyScanResult,
      );
    },
    [applyScanResult, notifyError, optionPath, patchOption, runCliCommand, t],
  );

  const reloadOption = useCallback(() => {
    scanOption(undefined, true, chartFormatsDirty);
  }, [chartFormatsDirty, scanOption]);

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
        configPath: "",
      });
      clearFileChanged();
      setScanPreviewOpen(false);
      return;
    }

    if (trimmedPath === scannedPath) return;
    scanOption(trimmedPath, false, false, true);
  }, [clearFileChanged, optionPath, patchOption, scannedPath, scanOption]);

  useTrackedPathWatch(optionPath, chartFilePaths, handleFileChanged);

  const handleBuild = async () => {
    if (!canRun) {
      notifyError(t("ui.option.errors.missingFolder"));
      return;
    }

    if (!canBuild) {
      if (!optionBuildCanExecute(exportSettings)) {
        notifyError(t("ui.option.errors.noop"));
        return;
      }
      notifyError(t("ui.option.errors.missingNameOrConfig"));
      return;
    }

    const output = await pickOutputFolder(getDirectory(optionPath));
    if (!output) return;

    void runCliCommand(optionBuildArgs(optionPath, output, buildSettings));
  };

  return (
    <ToolPageShell
      showHelp
      primaryLabel={t("ui.option.convert")}
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
          label={t("ui.option.folder")}
          value={optionPath}
          required
          mode="folder"
          onChange={(value) => patchOption({ optionPath: value })}
        />
        <FileChangedAlert changedAt={fileChangedAt} className="mt-3" />
      </WorkspaceSection>

      <OptionSettings
        chartFormatsDirty={chartFormatsDirty}
        reloadDisabled={isBusy}
        onChartFormatsChange={(value) => {
          patchOption({ chartFileDiscovery: value });
          setChartFormatsDirty(true);
        }}
        onSaveAndReload={reloadOption}
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
