import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { FieldGroup } from "@/components/ui/field";
import { FileChangedAlert } from "@/components/layout/FileChangedAlert";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { PropertiesSection } from "@/components/layout/PropertiesSection";
import { PropertyGroup } from "@/components/layout/PropertyGroup";
import { PropertyRow } from "@/components/layout/PropertyRow";
import { ToggleField } from "@/components/layout/PropertyFields";
import { ConvertWorkspace } from "@/components/convert/ConvertWorkspace";
import { DifficultyCombobox } from "@/components/convert/DifficultyCombobox";
import { useNativeFileDrop } from "@/hooks/use-native-file-drop";
import { useApp } from "@/contexts/AppContext";
import { useFileChangedReload } from "@/hooks/use-file-changed-reload";
import { useTrackedPathWatch } from "@/hooks/use-tracked-path-watch";
import { chartConvertArgs, chartInspectArgs } from "@/lib/cli-commands";
import {
  chartOutputExtension,
  chartOutputName,
  classifyConvertFile,
  suggestedPath,
} from "@/lib/convert-files";
import { CHART_FILE_FILTERS, pickSavePath } from "@/lib/file-picker";
import { parseChartInspectData } from "@/lib/cli-results";
import { CHART_DIFFICULTY_OPTIONS } from "@/lib/chart-difficulty";
import { useToolPageStore } from "@/stores/tool-page-store";

export function ChartPage() {
  const { t } = useTranslation();
  const { runCliCommand, notifyError, notifyInfo, isBusy } = useApp();
  const {
    chartPath,
    inspectedPath,
    data,
    songId,
    designer,
    difficultyId,
    mainBpm,
    insertBlankMeasure,
  } = useToolPageStore((state) => state.chart);
  const patchChart = useToolPageStore((state) => state.patchChart);
  const inspectChartRef = useRef<(path?: string, force?: boolean) => void>(() => {});

  const { fileChangedAt, handleFileChanged, clearFileChanged } = useFileChangedReload({
    enabled: chartPath.trim().length > 0,
    isBusy,
    onReload: () => inspectChartRef.current(),
  });

  const applyInspectResult = useCallback(
    (response: Parameters<typeof parseChartInspectData>[0]) => {
      const inspected = parseChartInspectData(response);
      if (!inspected) return;

      patchChart({
        inspectedPath: useToolPageStore.getState().chart.chartPath.trim(),
        data: inspected,
        songId: inspected.chart.songId == null ? "" : String(inspected.chart.songId),
        designer: inspected.chart.designer,
        difficultyId: inspected.metadata.difficultyId,
        mainBpm: String(inspected.chart.mainBpm),
        insertBlankMeasure: inspected.metadata.bgmEnableBarOffset,
      });
      clearFileChanged();
    },
    [clearFileChanged, patchChart],
  );

  const inspectChart = useCallback(
    (path?: string, force = true) => {
      const trimmedPath = (path ?? chartPath).trim();
      if (!trimmedPath) return;

      if (!force && useToolPageStore.getState().chart.inspectedPath === trimmedPath) return;

      void runCliCommand(chartInspectArgs(trimmedPath), applyInspectResult);
    },
    [applyInspectResult, chartPath, runCliCommand],
  );

  useEffect(() => {
    inspectChartRef.current = inspectChart;
  }, [inspectChart]);

  const loadChart = (path: string) => {
    patchChart({ chartPath: path, data: null });
  };

  useEffect(() => {
    const trimmedPath = chartPath.trim();
    if (!trimmedPath) {
      patchChart({ inspectedPath: "", data: null });
      clearFileChanged();
      return;
    }

    if (trimmedPath === inspectedPath) return;
    inspectChart(trimmedPath, false);
  }, [chartPath, clearFileChanged, inspectChart, inspectedPath, patchChart]);

  useTrackedPathWatch(chartPath, chartPath.trim() ? [chartPath] : [], handleFileChanged);

  const dropState = useNativeFileDrop((paths) => {
    const chart = paths.find((path) => classifyConvertFile(path) === "chart");
    if (chart) loadChart(chart);
    else notifyInfo(t("ui.chart.notify.invalidDrop"));
  });

  const handleConvert = async () => {
    if (!chartPath || !data) {
      notifyError(t("ui.chart.errors.missingChart"));
      return;
    }
    const parsedSongId = songId.trim() ? Number(songId) : undefined;
    const parsedBpm = Number(mainBpm);
    if ((parsedSongId != null && !Number.isInteger(parsedSongId)) || !Number.isFinite(parsedBpm)) {
      notifyError(t("ui.chart.errors.invalidSongIdOrBpm"));
      return;
    }
    const extension = chartOutputExtension(chartPath);
    const output = await pickSavePath({
      title: t("ui.chart.dialog.saveTitle", { extension: extension.slice(1).toUpperCase() }),
      defaultPath: suggestedPath(chartPath, chartOutputName(chartPath, songId, difficultyId)),
      filters: [
        {
          name: t("ui.chart.dialog.filterName", { extension: extension.slice(1).toUpperCase() }),
          extensions: [extension.slice(1)],
        },
      ],
    });
    if (!output) return;
    void runCliCommand(
      chartConvertArgs(chartPath, output, {
        songId: parsedSongId,
        designer,
        difficultyId,
        mainBpm: parsedBpm,
        insertBlankMeasure,
      }),
    );
  };

  return (
    <ToolPageShell
      showHelp
      primaryLabel={t("ui.common.actions.convert")}
      primaryDisabled={!data}
      onReload={() => inspectChart()}
      onPrimary={() => void handleConvert()}
    >
      <ConvertWorkspace isDragging={dropState.isDragging} dropMessage={t("ui.chart.dropMessage")}>
        <WorkspaceSection title={t("ui.common.sections.source")}>
          <FieldGroup>
            <FileChangedAlert changedAt={fileChangedAt} className="mb-3" />
            <FileFolderPicker
              label={t("ui.common.fields.chartFile")}
              value={chartPath}
              required
              filters={CHART_FILE_FILTERS}
              onChange={loadChart}
            />
          </FieldGroup>
        </WorkspaceSection>

        <PropertiesSection title={t("ui.common.sections.properties")}>
          <PropertyGroup title={t("ui.groups.song")} contentClassName="gap-0 py-0">
            <PropertyRow
              label={t("ui.properties.songId.label")}
              description={t("ui.properties.songId.description")}
              htmlFor="chart-song-id"
            >
              <Input
                id="chart-song-id"
                className="max-w-md"
                value={songId}
                inputMode="numeric"
                onChange={(event) => patchChart({ songId: event.target.value })}
              />
            </PropertyRow>
          </PropertyGroup>
          <PropertyGroup title={t("ui.groups.chart")} contentClassName="gap-0 py-0">
            <PropertyRow label={t("ui.chart.fields.designer")} htmlFor="chart-designer">
              <Input
                id="chart-designer"
                className="max-w-xl"
                value={designer}
                onChange={(event) => patchChart({ designer: event.target.value })}
              />
            </PropertyRow>
            <PropertyRow label={t("ui.chart.fields.difficulty")} htmlFor="chart-difficulty">
              <DifficultyCombobox
                id="chart-difficulty"
                className="max-w-xl"
                items={CHART_DIFFICULTY_OPTIONS}
                value={difficultyId}
                onValueChange={(id) => patchChart({ difficultyId: id })}
              />
            </PropertyRow>
            <PropertyRow
              label={t("ui.properties.displayBpm.label")}
              description={t("ui.properties.displayBpm.description")}
              htmlFor="chart-display-bpm"
            >
              <Input
                id="chart-display-bpm"
                className="max-w-md"
                value={mainBpm}
                inputMode="decimal"
                onChange={(event) => patchChart({ mainBpm: event.target.value })}
              />
            </PropertyRow>
          </PropertyGroup>
          <PropertyGroup title={t("ui.groups.sync")} contentClassName="gap-0 py-0">
            <PropertyRow
              label={t("ui.properties.blankMeasure.label")}
              description={t("ui.properties.blankMeasure.description")}
              htmlFor="chart-insert-blank-measure"
            >
              <ToggleField
                id="chart-insert-blank-measure"
                label={t("ui.properties.blankMeasure.label")}
                checked={insertBlankMeasure}
                compact
                onChange={(checked) => patchChart({ insertBlankMeasure: checked })}
              />
            </PropertyRow>
          </PropertyGroup>
        </PropertiesSection>
      </ConvertWorkspace>
    </ToolPageShell>
  );
}
