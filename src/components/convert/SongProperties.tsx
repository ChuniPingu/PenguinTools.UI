import { useTranslation } from "react-i18next";
import { MetadataOnlyInspection } from "@/components/convert/MetadataOnlyInspection";
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
import { formatOffset } from "@/lib/convert-files";
import { useToolPageStore } from "@/stores/tool-page-store";

function formatEntry(entry?: ApplicationEntry | null): string | null {
  if (!entry) return null;
  return [entry.id, entry.name, entry.data]
    .filter((value) => value != null && value !== "")
    .join(" · ");
}

export function SongProperties() {
  const { t } = useTranslation();
  const chartPath = useToolPageStore((state) => state.song.chartPath);
  const data = useToolPageStore((state) => state.song.data);
  const title = t("ui.common.sections.properties");

  if (!data) {
    return (
      <EmptyInspector
        title={title}
        standardHeading
        heading={
          chartPath.trim() ? t("ui.song.preview.noMetadata") : t("ui.song.preview.notInspected")
        }
      />
    );
  }

  const { chart, metadata } = data;
  if (!metadata || data.notesParsed === false) return <MetadataOnlyInspection data={data} />;
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
          metadataHelp="songId"
          mono
        />
        <InspectorRow label={t("ui.chart.preview.title")} value={chart.title} />
        <InspectorRow label={t("ui.chart.preview.artist")} value={chart.artist} />
        <InspectorRow
          label={t("ui.properties.sortName.label")}
          value={metadata.sortName}
          metadataHelp="sortName"
        />
        <InspectorRow
          label={t("ui.properties.genre.label")}
          value={formatEntry(metadata.genre)}
          metadataHelp="genre"
        />
      </InspectorSection>

      <InspectorSection title={t("ui.groups.chart")}>
        <InspectorRow
          label={t("ui.song.preview.labels.mgxcId")}
          value={chart.mgxcId}
          description={t("ui.properties.mgxcId.description")}
          mono
        />
        <InspectorRow label={t("ui.chart.fields.designer")} value={chart.designer} />
        <InspectorRow
          label={t("ui.chart.fields.difficulty")}
          value={normalizeDifficultyName(difficulty)}
        />
        {worldsEnd ? (
          <>
            <InspectorRow
              label={t("ui.chart.preview.weTag")}
              value={formatEntry(metadata.weTag)}
              metadataHelp="wetag"
            />
            <InspectorRow
              label={t("ui.chart.preview.weDifficulty")}
              value={formatWeDifficulty(metadata.weDifficultyId ?? 0, metadata.weDifficulty ?? "")}
            />
          </>
        ) : (
          <InspectorRow label={t("ui.chart.preview.level")} value={chart.level} />
        )}
        <InspectorRow label={t("ui.properties.displayBpm.label")} value={chart.mainBpm} />
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
          metadataHelp="date"
        />
        <InspectorRow
          label={t("ui.properties.mainTil.label")}
          value={metadata.mainTil}
          description={t("ui.properties.mainTil.description")}
          metadataHelp="mainTil"
          mono
        />
      </InspectorSection>

      <InspectorSection title={t("ui.groups.display")}>
        <InspectorRow
          label={t("ui.option.preview.customStage")}
          value={customStage ? t("ui.common.yes") : t("ui.common.no")}
        />
        <InspectorRow
          label={t("ui.properties.jacketFile.label")}
          value={metadata.jacketFilePath}
          mono
        />
        <InspectorRow
          label={t("ui.song.preview.labels.resolvedJacketFile")}
          value={metadata.fullJacketFilePath}
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
              metadataHelp="stage"
              mono
            />
            <InspectorRow
              label={t("ui.song.preview.labels.resolvedBackgroundFile")}
              value={metadata.fullBgiFilePath}
              mono
            />
            <InspectorRow
              label={t("ui.properties.notesFieldLine.label")}
              value={formatEntry(metadata.notesFieldLine)}
              metadataHelp="fline"
            />
          </>
        ) : (
          <InspectorRow
            label={t("ui.properties.stage.label")}
            value={formatEntry(metadata.stage)}
            metadataHelp="stage"
          />
        )}
      </InspectorSection>

      <InspectorSection title={t("ui.groups.bgm")}>
        <InspectorRow label={t("ui.audio.fields.audioFile")} value={metadata.bgmFilePath} mono />
        <InspectorRow
          label={t("ui.song.preview.labels.resolvedAudioFile")}
          value={metadata.fullBgmFilePath}
          mono
        />
        <InspectorRow
          label={t("ui.properties.previewStart.label")}
          value={metadata.bgmPreviewStart}
        />
        <InspectorRow
          label={t("ui.properties.previewStop.label")}
          value={metadata.bgmPreviewStop}
        />
      </InspectorSection>

      <InspectorSection title={t("ui.groups.sync")}>
        <InspectorRow
          label={t("ui.properties.realOffset.label")}
          value={formatOffset(metadata.bgmRealOffset)}
          description={t("ui.properties.realOffset.description")}
        />
        <InspectorRow
          label={t("ui.properties.manualOffset.label")}
          value={formatOffset(metadata.bgmManualOffset)}
        />
        <InspectorRow
          label={t("ui.properties.barOffset.label")}
          value={formatOffset(metadata.bgmBarOffset)}
          description={t("ui.properties.barOffset.description")}
        />
        <InspectorRow
          label={t("ui.properties.blankMeasure.label")}
          value={metadata.bgmEnableBarOffset ? t("ui.common.yes") : t("ui.common.no")}
          description={t("ui.properties.blankMeasure.description")}
          metadataHelp="blankMeasure"
        />
        <InspectorRow
          label={t("ui.properties.initialBpm.label")}
          value={metadata.bgmInitialBpm}
          metadataHelp="initialTiming"
        />
        <InspectorRow
          label={t("ui.properties.timeSignature.label")}
          value={`${metadata.bgmInitialNumerator}/${metadata.bgmInitialDenominator}`}
          metadataHelp="initialTiming"
        />
      </InspectorSection>
    </InspectorPanel>
  );
}
