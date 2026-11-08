import { ChartProperties } from "@/components/convert/ChartProperties";
import { EditorChartFormatField } from "@/components/convert/EditorChartFormatField";
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
import { chartOutputName, getExtension, suggestedPath } from "@/lib/convert-files";
import { C2S_FILE_FILTERS, pickSavePath } from "@/lib/file-picker";
import { useChartInspection } from "@/hooks/use-chart-inspection";
import { useToolPageStore } from "@/stores/tool-page-store";

export function ChartExtractPage() {
  const { t } = useTranslation();
  const { notifyError, notifyInfo } = useApp();
  const {
    chartPath,
    data,
    songId,
    designer,
    difficultyId,
    mainBpm,
    insertBlankMeasure,
    chartFormat,
  } = useToolPageStore((state) => state.extractChart);
  const patchExtractChart = useToolPageStore((state) => state.patchExtractChart);
  const { fileChangedAt, inspectChart, query } = useChartInspection("extractChart");

  const loadChart = (path: string) => {
    if (path && getExtension(path) !== "c2s") {
      notifyInfo(t("ui.extract.chart.notify.invalidDrop"));
      return;
    }
    patchExtractChart({ chartPath: path });
  };

  const dropState = useNativeFileDrop((paths) => {
    const chart = paths.find((path) => getExtension(path) === "c2s");
    if (chart) loadChart(chart);
    else notifyInfo(t("ui.extract.chart.notify.invalidDrop"));
  });

  const handleExtract = async () => {
    if (!chartPath || !canConvertInspectedChart(data)) {
      notifyError(t("ui.extract.chart.notify.missingChart"));
      return;
    }
    const parsedSongId = songId.trim() ? Number(songId) : undefined;
    const parsedBpm = Number(mainBpm);
    if ((parsedSongId != null && !Number.isInteger(parsedSongId)) || !Number.isFinite(parsedBpm)) {
      notifyError(t("ui.extract.chart.notify.invalidSongIdOrBpm"));
      return;
    }
    const output = await pickSavePath({
      historyKey: "extract.chart.output",
      title: t("ui.extract.chart.dialog.saveTitle", { extension: chartFormat.toUpperCase() }),
      defaultPath: suggestedPath(
        chartPath,
        chartOutputName(chartPath, songId, difficultyId, chartFormat),
      ),
      filters: [
        {
          name: t("ui.extract.chart.dialog.filterName", { extension: chartFormat.toUpperCase() }),
          extensions: [chartFormat],
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
      primaryLabel={t("ui.common.actions.extract")}
      reloadDisabled={!chartPath.trim()}
      primaryDisabled={!canConvertInspectedChart(data)}
      onReload={() => inspectChart()}
      onPrimary={() => void handleExtract()}
    >
      <ConvertWorkspace
        isDragging={dropState.isDragging}
        dropMessage={t("ui.extract.chart.dropMessage")}
      >
        <WorkspaceSection title={t("ui.common.sections.source")}>
          <FieldGroup>
            <FileChangedAlert changedAt={fileChangedAt} className="mb-3" />
            <FileFolderPicker
              historyKey="extract.chart.input"
              label={t("ui.extract.chart.fields.c2s")}
              value={chartPath}
              filters={C2S_FILE_FILTERS}
              onChange={loadChart}
            />
          </FieldGroup>
        </WorkspaceSection>

        <ChartProperties page="extractChart">
          <EditorChartFormatField
            id="extract-chart-format"
            value={chartFormat}
            onChange={(value) => patchExtractChart({ chartFormat: value })}
          />
        </ChartProperties>
      </ConvertWorkspace>
    </ToolPageShell>
  );
}
