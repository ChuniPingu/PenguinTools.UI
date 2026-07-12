import { useTranslation } from "react-i18next";
import {
  EmptyInspector,
  InspectorPanel,
  InspectorRow,
  InspectorSection,
} from "@/components/layout/PropertyInspector";
import {
  formatWeDifficulty,
  isWorldsEndDifficulty,
  normalizeDifficultyName,
  showsUnlockEventId,
} from "@/lib/chart-difficulty";
import type { ApplicationEntry } from "@/lib/cli-results";
import { useToolPageStore } from "@/stores/tool-page-store";

function formatEntry(entry?: ApplicationEntry | null): string | null {
  if (!entry) return null;
  return [entry.id, entry.name, entry.data]
    .filter((value) => value != null && value !== "")
    .join(" · ");
}

export function SongProperties() {
  const { t } = useTranslation();
  const data = useToolPageStore((state) => state.song.data);
  const title = t("ui.common.sections.properties");

  if (!data) {
    return (
      <EmptyInspector title={title} standardHeading>
        {t("ui.song.preview.notAvailable")}
      </EmptyInspector>
    );
  }

  const { chart, metadata } = data;
  const difficulty = metadata.difficulty || chart.difficulty;
  const worldsEnd = isWorldsEndDifficulty(difficulty);
  const customStage = metadata.isCustomStage;

  return (
    <InspectorPanel title={title} standardHeading>
      <InspectorSection title={t("ui.groups.song")}>
        <InspectorRow
          label={t("ui.properties.songId.label")}
          value={chart.songId}
          description={t("ui.properties.songId.description")}
          mono
        />
        <InspectorRow
          label={t("ui.chart.preview.title")}
          value={chart.title}
          description={t("ui.song.inspectorHelp.title")}
        />
        <InspectorRow
          label={t("ui.chart.preview.artist")}
          value={chart.artist}
          description={t("ui.song.inspectorHelp.artist")}
        />
        <InspectorRow
          label={t("ui.properties.sortName.label")}
          value={metadata.sortName}
          description={t("ui.properties.sortName.description")}
        />
        <InspectorRow
          label={t("ui.properties.genre.label")}
          value={formatEntry(metadata.genre)}
          description={t("ui.properties.genre.description")}
          metadataHelp="genre"
        />
      </InspectorSection>

      <InspectorSection title={t("ui.groups.chart")}>
        <InspectorRow
          label={t("ui.song.preview.labels.mgxcId")}
          value={chart.mgxcId}
          description={t("ui.song.inspectorHelp.mgxcId")}
          mono
        />
        <InspectorRow
          label={t("ui.chart.fields.designer")}
          value={chart.designer}
          description={t("ui.song.inspectorHelp.designer")}
        />
        <InspectorRow
          label={t("ui.chart.fields.difficulty")}
          value={normalizeDifficultyName(difficulty)}
          description={t("ui.song.inspectorHelp.difficulty")}
        />
        <InspectorRow
          label={t("ui.song.preview.labels.difficultyId")}
          value={metadata.difficultyId}
          description={t("ui.song.inspectorHelp.difficultyId")}
          mono
        />
        {worldsEnd ? (
          <>
            <InspectorRow
              label={t("ui.chart.preview.weTag")}
              value={formatEntry(metadata.weTag)}
              description={t("ui.song.inspectorHelp.weTag")}
              metadataHelp="wetag"
            />
            <InspectorRow
              label={t("ui.chart.preview.weDifficulty")}
              value={formatWeDifficulty(metadata.weDifficultyId ?? 0, metadata.weDifficulty ?? "")}
              description={t("ui.song.inspectorHelp.weDifficulty")}
            />
          </>
        ) : (
          <InspectorRow
            label={t("ui.chart.preview.level")}
            value={chart.level}
            description={t("ui.song.inspectorHelp.level")}
          />
        )}
        <InspectorRow
          label={t("ui.properties.displayBpm.label")}
          value={chart.mainBpm}
          description={t("ui.properties.displayBpm.description")}
        />
        {showsUnlockEventId(difficulty) ? (
          <InspectorRow
            label={t("ui.properties.unlockEvent.label")}
            value={metadata.unlockEventId}
            description={t("ui.properties.unlockEvent.description")}
            mono
          />
        ) : null}
        <InspectorRow
          label={t("ui.properties.releaseDate.label")}
          value={metadata.releaseDate}
          description={t("ui.properties.releaseDate.description")}
          metadataHelp="date"
        />
        <InspectorRow
          label={t("ui.properties.mainTil.label")}
          value={metadata.mainTil}
          description={t("ui.properties.mainTil.description")}
          mono
        />
      </InspectorSection>

      <InspectorSection title={t("ui.groups.display")}>
        <InspectorRow
          label={t("ui.option.preview.customStage")}
          value={customStage ? t("ui.common.yes") : t("ui.common.no")}
          description={t("ui.song.inspectorHelp.customStage")}
        />
        <InspectorRow
          label={t("ui.properties.jacketFile.label")}
          value={metadata.jacketFilePath}
          description={t("ui.properties.jacketFile.description")}
          mono
        />
        <InspectorRow
          label={t("ui.song.preview.labels.resolvedJacketFile")}
          value={metadata.fullJacketFilePath}
          description={t("ui.song.inspectorHelp.resolvedFile")}
          mono
        />
        {customStage ? (
          <>
            <InspectorRow
              label={t("ui.properties.stageId.label")}
              value={metadata.stageId}
              description={t("ui.properties.stageId.description")}
              mono
            />
            <InspectorRow
              label={t("ui.properties.backgroundFile.label")}
              value={metadata.bgiFilePath}
              description={t("ui.properties.backgroundFile.description")}
              mono
            />
            <InspectorRow
              label={t("ui.song.preview.labels.resolvedBackgroundFile")}
              value={metadata.fullBgiFilePath}
              description={t("ui.song.inspectorHelp.resolvedFile")}
              mono
            />
            <InspectorRow
              label={t("ui.properties.notesFieldLine.label")}
              value={formatEntry(metadata.notesFieldLine)}
              description={t("ui.properties.notesFieldLine.description")}
              metadataHelp="fline"
            />
          </>
        ) : (
          <InspectorRow
            label={t("ui.properties.stage.label")}
            value={formatEntry(metadata.stage)}
            description={t("ui.properties.stage.description")}
            metadataHelp="stage"
          />
        )}
      </InspectorSection>

      <InspectorSection title={t("ui.groups.bgm")}>
        <InspectorRow
          label={t("ui.audio.fields.audioFile")}
          value={metadata.bgmFilePath}
          description={t("ui.song.inspectorHelp.audioFile")}
          mono
        />
        <InspectorRow
          label={t("ui.song.preview.labels.resolvedAudioFile")}
          value={metadata.fullBgmFilePath}
          description={t("ui.song.inspectorHelp.resolvedFile")}
          mono
        />
        <InspectorRow
          label={t("ui.properties.previewStart.label")}
          value={metadata.bgmPreviewStart}
          description={t("ui.properties.previewStart.description")}
        />
        <InspectorRow
          label={t("ui.properties.previewStop.label")}
          value={metadata.bgmPreviewStop}
          description={t("ui.properties.previewStop.description")}
        />
      </InspectorSection>

      <InspectorSection title={t("ui.groups.sync")}>
        <InspectorRow
          label={t("ui.properties.manualOffset.label")}
          value={metadata.bgmManualOffset}
          description={t("ui.properties.manualOffset.description")}
        />
        <InspectorRow
          label={t("ui.properties.blankMeasure.label")}
          value={metadata.bgmEnableBarOffset ? t("ui.common.yes") : t("ui.common.no")}
          description={t("ui.properties.blankMeasure.description")}
        />
        <InspectorRow
          label={t("ui.properties.initialBpm.label")}
          value={metadata.bgmInitialBpm}
          description={t("ui.properties.initialBpm.description")}
        />
        <InspectorRow
          label={t("ui.properties.timeSignature.label")}
          value={`${metadata.bgmInitialNumerator}/${metadata.bgmInitialDenominator}`}
          description={t("ui.properties.timeSignature.description")}
        />
        <InspectorRow
          label={t("ui.song.preview.labels.barOffset")}
          value={metadata.bgmBarOffset}
          description={t("ui.song.inspectorHelp.barOffset")}
        />
        <InspectorRow
          label={t("ui.properties.realOffset.label")}
          value={metadata.bgmRealOffset}
          description={t("ui.properties.realOffset.description")}
        />
      </InspectorSection>

      <InspectorSection title={t("ui.groups.advanced")}>
        <InspectorRow
          label={t("ui.option.preview.filePath")}
          value={chart.filePath}
          description={t("ui.song.inspectorHelp.chartFile")}
          mono
        />
        <InspectorRow
          label={t("ui.song.preview.labels.inputPath")}
          value={data.inputPath}
          description={t("ui.song.inspectorHelp.inputPath")}
          mono
        />
      </InspectorSection>
    </InspectorPanel>
  );
}
