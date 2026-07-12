import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FieldGroup } from "@/components/ui/field";
import { SongProperties } from "@/components/convert/SongProperties";
import { FileChangedAlert } from "@/components/layout/FileChangedAlert";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { useApp } from "@/contexts/AppContext";
import { useFileChangedReload } from "@/hooks/use-file-changed-reload";
import { useTrackedPathWatch } from "@/hooks/use-tracked-path-watch";
import { chartInspectArgs, musicBuildArgs } from "@/lib/cli-commands";
import { CHART_FILE_FILTERS, pickOutputFolder } from "@/lib/file-picker";
import { parseChartInspectData } from "@/lib/cli-results";
import { getDirectory } from "@/lib/paths";
import { useToolPageStore } from "@/stores/tool-page-store";

export function SongPage() {
  const { t } = useTranslation();
  const { runCliCommand, notifyError, isBusy } = useApp();
  const song = useToolPageStore((state) => state.song);
  const patchSong = useToolPageStore((state) => state.patchSong);
  const inspectChartRef = useRef<(path?: string, force?: boolean) => void>(() => {});

  const canRun = song.chartPath.trim().length > 0 && song.data != null;

  const { fileChangedAt, handleFileChanged, clearFileChanged } = useFileChangedReload({
    enabled: canRun,
    isBusy,
    onReload: () => inspectChartRef.current(),
  });

  const applyInspectResult = useCallback(
    (response: Parameters<typeof parseChartInspectData>[0]) => {
      const inspected = parseChartInspectData(response);
      if (!inspected) {
        patchSong({ inspectedPath: "", data: null });
        return;
      }

      patchSong({
        inspectedPath: useToolPageStore.getState().song.chartPath.trim(),
        data: inspected,
      });
      clearFileChanged();
    },
    [clearFileChanged, patchSong],
  );

  const inspectChart = useCallback(
    (path?: string, force = true) => {
      const trimmedPath = (path ?? song.chartPath).trim();
      if (!trimmedPath) {
        notifyError(t("ui.song.errors.missingChart"));
        return;
      }

      if (!force && useToolPageStore.getState().song.inspectedPath === trimmedPath) return;

      void runCliCommand(chartInspectArgs(trimmedPath), applyInspectResult);
    },
    [applyInspectResult, notifyError, runCliCommand, song.chartPath, t],
  );

  useEffect(() => {
    inspectChartRef.current = inspectChart;
  }, [inspectChart]);

  useEffect(() => {
    const trimmedPath = song.chartPath.trim();
    if (!trimmedPath) {
      patchSong({ inspectedPath: "", data: null });
      clearFileChanged();
      return;
    }

    if (trimmedPath === song.inspectedPath) return;
    inspectChart(trimmedPath, false);
  }, [clearFileChanged, inspectChart, patchSong, song.chartPath, song.inspectedPath]);

  useTrackedPathWatch(
    song.chartPath,
    song.chartPath.trim() ? [song.chartPath] : [],
    handleFileChanged,
  );

  const handleBuild = async () => {
    if (!canRun) {
      notifyError(t("ui.song.errors.missingChart"));
      return;
    }

    const output = await pickOutputFolder(getDirectory(song.chartPath));
    if (!output) return;

    void runCliCommand(musicBuildArgs(song.chartPath, output));
  };

  return (
    <ToolPageShell
      showHelp
      primaryLabel={t("ui.common.actions.convert")}
      primaryDisabled={!canRun}
      onReload={() => inspectChart()}
      onPrimary={() => void handleBuild()}
    >
      <WorkspaceSection title={t("ui.common.sections.source")}>
        <FieldGroup>
          <FileChangedAlert changedAt={fileChangedAt} />
          <FileFolderPicker
            label={t("ui.common.fields.chartFile")}
            value={song.chartPath}
            required
            filters={CHART_FILE_FILTERS}
            onChange={(value) => patchSong({ chartPath: value })}
          />
        </FieldGroup>
      </WorkspaceSection>

      <SongProperties />
    </ToolPageShell>
  );
}
