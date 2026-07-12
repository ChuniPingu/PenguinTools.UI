import { useTranslation } from "react-i18next";
import {
  EmptyInspector,
  InspectorPanel,
  InspectorRow,
  InspectorSection,
} from "@/components/layout/PropertyInspector";
import type { OptionScanBook } from "@/lib/cli-results";
import {
  formatWeDifficulty,
  isWorldsEndDifficulty,
  normalizeDifficultyName,
  showsUnlockEventId,
} from "@/lib/chart-difficulty";
import type { OptionScanSelection } from "@/stores/tool-page-store";

function formatEntry(entry?: { id: number; name: string } | null): string {
  return entry ? `${entry.id} · ${entry.name}` : "—";
}

function chartFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] ?? filePath;
}

export function OptionSelectionProperties({
  books,
  selection,
}: {
  books: OptionScanBook[];
  selection: OptionScanSelection | null;
}) {
  const { t } = useTranslation();

  if (books.length === 0) {
    return (
      <EmptyInspector title={t("ui.option.preview.properties")}>
        {t("ui.option.emptyPreview")}
      </EmptyInspector>
    );
  }

  if (!selection) {
    return (
      <EmptyInspector title={t("ui.option.preview.properties")}>
        {t("ui.option.preview.notAvailable")}
      </EmptyInspector>
    );
  }

  const book = books[selection.bookIndex];
  if (!book) return null;

  if (selection.kind === "chart") {
    const chart = book.charts[selection.chartIndex];
    return chart ? <ChartInspector chart={chart} /> : null;
  }

  return <BookInspector book={book} />;
}

function BookInspector({ book }: { book: OptionScanBook }) {
  const { t } = useTranslation();
  const mainDifficulty = book.mainDifficulty ?? book.charts[0]?.difficulty ?? "";
  const worldsEnd = isWorldsEndDifficulty(mainDifficulty);
  const customStage = book.isCustomStage ?? false;
  const subtitle = [book.songId, book.title]
    .filter((value) => value != null && value !== "")
    .join(" · ");

  return (
    <InspectorPanel title={t("ui.option.preview.properties")} subtitle={subtitle}>
      <InspectorSection title={t("ui.groups.misc")}>
        <InspectorRow
          label={t("ui.option.preview.mainDifficulty")}
          value={normalizeDifficultyName(mainDifficulty)}
          description={t("ui.option.preview.help.mainDifficulty")}
          metadataHelp="main"
        />
      </InspectorSection>

      <InspectorSection title={t("ui.groups.song")}>
        <InspectorRow label={t("ui.properties.songId.label")} value={book.songId} mono />
        <InspectorRow label={t("ui.chart.preview.title")} value={book.title} />
        <InspectorRow label={t("ui.properties.sortName.label")} value={book.sortName} />
        <InspectorRow label={t("ui.chart.preview.artist")} value={book.artist} />
        <InspectorRow
          label={t("ui.properties.genre.label")}
          value={formatEntry(book.genre)}
          description={t("ui.properties.genre.description")}
          metadataHelp="genre"
        />
      </InspectorSection>

      <InspectorSection title={t("ui.groups.chart")}>
        {showsUnlockEventId(mainDifficulty) ? (
          <InspectorRow
            label={t("ui.properties.unlockEvent.label")}
            value={book.unlockEventId}
            mono
          />
        ) : null}
        {worldsEnd ? (
          <>
            <InspectorRow
              label={t("ui.chart.preview.weTag")}
              value={formatEntry(book.weTag)}
              description={t("ui.song.inspectorHelp.weTag")}
              metadataHelp="wetag"
            />
            <InspectorRow
              label={t("ui.chart.preview.weDifficulty")}
              value={formatWeDifficulty(book.weDifficultyId, book.weDifficulty)}
            />
          </>
        ) : null}
        <InspectorRow
          label={t("ui.properties.releaseDate.label")}
          value={book.releaseDate}
          description={t("ui.properties.releaseDate.description")}
          metadataHelp="date"
        />
      </InspectorSection>

      <InspectorSection title={t("ui.groups.display")}>
        <InspectorRow
          label={t("ui.properties.jacketFile.label")}
          value={book.jacketFilePath}
          mono
        />
        <InspectorRow
          label={t("ui.option.preview.customStage")}
          value={customStage ? t("ui.common.yes") : t("ui.common.no")}
        />
        {customStage ? (
          <>
            <InspectorRow label={t("ui.properties.stageId.label")} value={book.stageId} mono />
            <InspectorRow
              label={t("ui.properties.backgroundFile.label")}
              value={book.bgiFilePath}
              mono
            />
            <InspectorRow
              label={t("ui.properties.notesFieldLine.label")}
              value={formatEntry(book.notesFieldLine)}
              description={t("ui.properties.notesFieldLine.description")}
              metadataHelp="fline"
            />
          </>
        ) : (
          <InspectorRow
            label={t("ui.properties.stage.label")}
            value={formatEntry(book.stage)}
            description={t("ui.properties.stage.description")}
            metadataHelp="stage"
          />
        )}
      </InspectorSection>

      <InspectorSection title={t("ui.groups.bgm")}>
        <InspectorRow label={t("ui.audio.fields.audioFile")} value={book.bgmFilePath} mono />
        <InspectorRow label={t("ui.properties.previewStart.label")} value={book.bgmPreviewStart} />
        <InspectorRow label={t("ui.properties.previewStop.label")} value={book.bgmPreviewStop} />
      </InspectorSection>

      <InspectorSection title={t("ui.groups.sync")}>
        <InspectorRow
          label={t("ui.properties.realOffset.label")}
          value={book.bgmRealOffset != null ? book.bgmRealOffset.toFixed(3) : null}
        />
        <InspectorRow label={t("ui.properties.manualOffset.label")} value={book.bgmManualOffset} />
        <InspectorRow
          label={t("ui.properties.blankMeasure.label")}
          value={
            book.bgmEnableBarOffset == null
              ? null
              : book.bgmEnableBarOffset
                ? t("ui.common.yes")
                : t("ui.common.no")
          }
        />
        <InspectorRow label={t("ui.properties.initialBpm.label")} value={book.bgmInitialBpm} />
        <InspectorRow
          label={t("ui.properties.timeSignature.label")}
          value={
            book.bgmInitialNumerator != null && book.bgmInitialDenominator != null
              ? `${book.bgmInitialNumerator}/${book.bgmInitialDenominator}`
              : null
          }
        />
      </InspectorSection>
    </InspectorPanel>
  );
}

function ChartInspector({ chart }: { chart: OptionScanBook["charts"][number] }) {
  const { t } = useTranslation();
  const worldsEnd = isWorldsEndDifficulty(chart.difficulty);

  return (
    <InspectorPanel
      title={t("ui.option.preview.properties")}
      subtitle={chartFileName(chart.filePath)}
    >
      <InspectorSection title={t("ui.groups.chart")}>
        <InspectorRow label={t("ui.option.preview.filePath")} value={chart.filePath} mono />
        <InspectorRow
          label={t("ui.option.preview.main")}
          value={chart.isMain ? t("ui.common.yes") : t("ui.common.no")}
          description={t("ui.option.preview.help.main")}
          metadataHelp="main"
        />
        <InspectorRow label={t("ui.properties.songId.label")} value={chart.songId} mono />
        <InspectorRow label={t("ui.song.preview.labels.mgxcId")} value={chart.mgxcId} mono />
        <InspectorRow label={t("ui.chart.fields.designer")} value={chart.designer} />
        <InspectorRow
          label={t("ui.chart.fields.difficulty")}
          value={normalizeDifficultyName(chart.difficulty)}
        />
        {worldsEnd ? null : (
          <InspectorRow label={t("ui.chart.preview.level")} value={chart.level.toFixed(1)} />
        )}
        <InspectorRow label={t("ui.properties.displayBpm.label")} value={chart.mainBpm} />
        <InspectorRow label={t("ui.properties.mainTil.label")} value={chart.mainTil} />
      </InspectorSection>
    </InspectorPanel>
  );
}
