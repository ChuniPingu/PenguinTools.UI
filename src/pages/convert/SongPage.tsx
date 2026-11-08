import { useTranslation } from "react-i18next";
import { FieldGroup } from "@/components/ui/field";
import { SongProperties } from "@/components/convert/SongProperties";
import { FileChangedAlert } from "@/components/layout/FileChangedAlert";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { useApp } from "@/contexts/AppContext";
import { musicBuildArgs } from "@/lib/cli-commands";
import { canConvertInspectedChart } from "@/lib/cli-results";
import { CHART_FILE_FILTERS, pickOutputFolder } from "@/lib/file-picker";
import { useChartInspection } from "@/hooks/use-chart-inspection";
import { getDirectory } from "@/lib/paths";
import { useToolPageStore } from "@/stores/tool-page-store";

export function SongPage() {
  const { t } = useTranslation();
  const { notifyError } = useApp();
  const song = useToolPageStore((state) => state.song);
  const patchSong = useToolPageStore((state) => state.patchSong);
  const { fileChangedAt, inspectChart, query } = useChartInspection("song");

  const canRun = song.chartPath.trim().length > 0 && canConvertInspectedChart(song.data);

  const handleBuild = async () => {
    if (!canRun) {
      notifyError(t("ui.song.notify.missingChart"));
      return;
    }

    const output = await pickOutputFolder("convert.song.output", getDirectory(song.chartPath));
    if (!output) return;

    void query.runCommand(musicBuildArgs(song.chartPath, output));
  };

  return (
    <ToolPageShell
      task={query}
      primaryLabel={t("ui.common.actions.convert")}
      reloadDisabled={!song.chartPath.trim()}
      primaryDisabled={!canRun}
      onReload={() => inspectChart()}
      onPrimary={() => void handleBuild()}
    >
      <WorkspaceSection title={t("ui.common.sections.source")}>
        <FieldGroup>
          <FileChangedAlert changedAt={fileChangedAt} />
          <FileFolderPicker
            historyKey="convert.song.input"
            label={t("ui.common.fields.chartFile")}
            value={song.chartPath}
            filters={CHART_FILE_FILTERS}
            onChange={(value) => patchSong({ chartPath: value })}
          />
        </FieldGroup>
      </WorkspaceSection>

      <SongProperties />
    </ToolPageShell>
  );
}
