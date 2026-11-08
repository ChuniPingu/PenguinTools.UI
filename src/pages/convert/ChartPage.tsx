import { ChartProperties } from "@/components/convert/ChartProperties";
import { useTranslation } from "react-i18next";
import { FieldGroup } from "@/components/ui/field";
import { FileChangedAlert } from "@/components/layout/FileChangedAlert";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { ConvertWorkspace } from "@/components/convert/ConvertWorkspace";
import { useNativeFileDrop } from "@/hooks/use-native-file-drop";
import { useApp } from "@/contexts/AppContext";
import { chartConvertArgs } from "@/lib/cli-commands";
import { canConvertInspectedChart } from "@/lib/cli-results";
import {
  chartOutputExtension,
  chartOutputName,
  classifyConvertFile,
  getExtension,
  suggestedPath,
} from "@/lib/convert-files";
import { CHART_FILE_FILTERS, pickSavePath } from "@/lib/file-picker";
import { useChartInspection } from "@/hooks/use-chart-inspection";
import { useToolPageStore } from "@/stores/tool-page-store";

export function ChartPage() {
  const { t } = useTranslation();
  const { notifyError, notifyInfo } = useApp();
  const { chartPath, data, songId, designer, difficultyId, mainBpm, insertBlankMeasure } =
    useToolPageStore((state) => state.chart);
  const patchChart = useToolPageStore((state) => state.patchChart);
  const { fileChangedAt, inspectChart, query } = useChartInspection("chart");

  const loadChart = (path: string) => {
    if (path && getExtension(path) === "c2s") {
      notifyInfo(t("ui.chart.notify.invalidDrop"));
      return;
    }
    patchChart({ chartPath: path });
  };

  const dropState = useNativeFileDrop((paths) => {
    const chart = paths.find(
      (path) => classifyConvertFile(path) === "chart" && getExtension(path) !== "c2s",
    );
    if (chart) loadChart(chart);
    else notifyInfo(t("ui.chart.notify.invalidDrop"));
  });

  const handleConvert = async () => {
    if (!chartPath || !canConvertInspectedChart(data)) {
      notifyError(t("ui.chart.notify.missingChart"));
      return;
    }
    const parsedSongId = songId.trim() ? Number(songId) : undefined;
    const parsedBpm = Number(mainBpm);
    if ((parsedSongId != null && !Number.isInteger(parsedSongId)) || !Number.isFinite(parsedBpm)) {
      notifyError(t("ui.chart.notify.invalidSongIdOrBpm"));
      return;
    }
    const extension = chartOutputExtension(chartPath);
    const output = await pickSavePath({
      historyKey: "convert.chart.output",
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
    void query.runCommand(
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
      task={query}
      primaryLabel={t("ui.common.actions.convert")}
      reloadDisabled={!chartPath.trim()}
      primaryDisabled={!canConvertInspectedChart(data)}
      onReload={() => inspectChart()}
      onPrimary={() => void handleConvert()}
    >
      <ConvertWorkspace isDragging={dropState.isDragging} dropMessage={t("ui.chart.dropMessage")}>
        <WorkspaceSection title={t("ui.common.sections.source")}>
          <FieldGroup>
            <FileChangedAlert changedAt={fileChangedAt} className="mb-3" />
            <FileFolderPicker
              historyKey="convert.chart.input"
              label={t("ui.common.fields.chartFile")}
              value={chartPath}
              filters={CHART_FILE_FILTERS}
              onChange={loadChart}
            />
          </FieldGroup>
        </WorkspaceSection>

        <ChartProperties page="chart" />
      </ConvertWorkspace>
    </ToolPageShell>
  );
}
