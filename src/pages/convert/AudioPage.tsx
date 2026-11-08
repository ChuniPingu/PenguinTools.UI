import { useTranslation } from "react-i18next";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { AudioProperties } from "@/components/convert/AudioProperties";
import { ConvertWorkspace } from "@/components/convert/ConvertWorkspace";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { useNativeFileDrop } from "@/hooks/use-native-file-drop";
import { useApp } from "@/contexts/AppContext";
import { audioFileConvertArgs } from "@/lib/cli-commands";
import { usePageTask } from "@/hooks/use-page-task";
import { classifyConvertFile, formatOffset } from "@/lib/convert-files";
import { AUDIO_SOURCE_FILTERS, pickOutputFolder } from "@/lib/file-picker";
import { getDirectory } from "@/lib/paths";
import { canConvertInspectedChart, parseChartInspectData } from "@/lib/cli-results";
import { useToolPageStore } from "@/stores/tool-page-store";

export function AudioPage() {
  const { t } = useTranslation();
  const { notifyError, notifyInfo } = useApp();
  const query = usePageTask("audio");
  const {
    chartPath,
    audioPath,
    songId,
    previewStart,
    previewStop,
    manualOffset,
    insertBlankMeasure,
    initialBpm,
    initialNumerator,
    initialDenominator,
    hcaKey,
  } = useToolPageStore((state) => state.audio);
  const patchAudio = useToolPageStore((state) => state.patchAudio);
  const sourceError = useToolPageStore((state) => state.audio.sourceError);
  const setSourceError = (sourceError: string) => patchAudio({ sourceError });

  const loadChart = (path: string, applyAudio = true) => {
    patchAudio({ chartPath: path });
    setSourceError("");
    void query.run({ kind: "chartInspect", path }, (response) => {
      if (useToolPageStore.getState().audio.chartPath.trim() !== path.trim()) return;
      const inspected = parseChartInspectData(response);
      if (!canConvertInspectedChart(inspected)) {
        setSourceError(t("ui.errors.chartUnread"));
        return;
      }
      const meta = inspected.metadata;
      const patch: Parameters<typeof patchAudio>[0] = {
        songId: inspected.chart.songId == null ? "" : String(inspected.chart.songId),
        previewStart: String(meta.bgmPreviewStart),
        previewStop: String(meta.bgmPreviewStop),
        manualOffset: formatOffset(meta.bgmManualOffset) ?? "0.000000",
        insertBlankMeasure: meta.bgmEnableBarOffset,
        initialBpm: String(meta.bgmInitialBpm),
        initialNumerator: String(meta.bgmInitialNumerator),
        initialDenominator: String(meta.bgmInitialDenominator),
      };
      if (applyAudio) {
        if (meta.fullBgmFilePath) {
          patch.audioPath = meta.fullBgmFilePath;
          setSourceError("");
        } else {
          patch.audioPath = "";
          setSourceError(t("ui.audio.errors.noAudioInChart"));
        }
      }
      patchAudio(patch);
    });
  };

  const selectAudio = (path: string, preserveQuery = false) => {
    if (!preserveQuery) query.reset();
    patchAudio({ audioPath: path });
    setSourceError("");
  };
  const handleSourceChange = (path: string) => {
    if (!path) {
      selectAudio(path);
      return;
    }
    if (classifyConvertFile(path) === "chart") loadChart(path);
    else selectAudio(path);
  };
  const dropState = useNativeFileDrop((paths) => {
    const chart = paths.find((path) => classifyConvertFile(path) === "chart");
    const audio = paths.find((path) => classifyConvertFile(path) === "audio");
    if (chart) loadChart(chart, !audio);
    if (audio) selectAudio(audio, !!chart);
    if (!chart && !audio) notifyInfo(t("ui.audio.notify.invalidDrop"));
  });

  const handleConvert = async () => {
    const values = {
      songId: Number(songId),
      previewStart: Number(previewStart),
      previewStop: Number(previewStop),
      manualOffset: Number(manualOffset),
      initialBpm: Number(initialBpm),
      initialNumerator: Number(initialNumerator),
      initialDenominator: Number(initialDenominator),
    };
    if (!audioPath || !songId.trim() || !Number.isInteger(values.songId)) {
      notifyError(t("ui.audio.notify.missingAudioOrSongId"));
      return;
    }
    if (
      Object.values(values).some((value) => !Number.isFinite(value)) ||
      values.previewStart < 0 ||
      values.previewStop < values.previewStart ||
      values.initialBpm <= 0 ||
      values.initialNumerator <= 0 ||
      values.initialDenominator <= 0
    ) {
      notifyError(t("ui.audio.notify.invalidTiming"));
      return;
    }
    try {
      const parsedKey = BigInt(hcaKey);
      if (parsedKey < 0n || parsedKey > 18446744073709551615n) {
        throw new RangeError(t("ui.common.notify.invalidHcaKey"));
      }
    } catch {
      notifyError(t("ui.common.notify.invalidHcaKey"));
      return;
    }
    const output = await pickOutputFolder("convert.audio.output", getDirectory(audioPath));
    if (!output) return;
    void query.runCommand(
      audioFileConvertArgs(audioPath, output, {
        ...values,
        insertBlankMeasure,
        hcaKey,
      }),
    );
  };

  return (
    <ToolPageShell
      task={query}
      primaryLabel={t("ui.common.actions.convert")}
      reloadDisabled={!chartPath}
      primaryDisabled={!audioPath}
      onReload={() => chartPath && loadChart(chartPath)}
      onPrimary={() => void handleConvert()}
    >
      <ConvertWorkspace isDragging={dropState.isDragging} dropMessage={t("ui.audio.dropMessage")}>
        <WorkspaceSection title={t("ui.common.sections.source")}>
          <FieldGroup>
            <FileFolderPicker
              historyKey="convert.audio.input"
              label={t("ui.audio.fields.audioFile")}
              value={audioPath}
              filters={AUDIO_SOURCE_FILTERS}
              onChange={handleSourceChange}
            />
            {sourceError ? <FieldError>{sourceError}</FieldError> : null}
          </FieldGroup>
        </WorkspaceSection>

        <AudioProperties />
      </ConvertWorkspace>
    </ToolPageShell>
  );
}
