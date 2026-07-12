import type { OptionScanBook, OptionScanChart } from "@/lib/cli-results";

function chartFromBook(book: OptionScanBook, mainDifficulty: string): OptionScanChart | undefined {
  return (
    book.charts.find((chart) => chart.difficulty === mainDifficulty) ??
    book.charts.find((chart) => chart.isMain) ??
    book.charts[0]
  );
}

function bookFieldsFromChart(chart: OptionScanChart) {
  return {
    sortName: chart.sortName ?? "",
    genre: chart.genre,
    unlockEventId: chart.unlockEventId ?? null,
    releaseDate: chart.releaseDate ?? "",
    isCustomStage: chart.isCustomStage ?? false,
    stageId: chart.stageId ?? null,
    bgiFilePath: chart.bgiFilePath ?? "",
    notesFieldLine: chart.notesFieldLine,
    stage: chart.stage,
    weTag: chart.weTag,
    weDifficultyId: chart.weDifficultyId ?? 0,
    weDifficulty: chart.weDifficulty ?? "",
    jacketFilePath: chart.jacketFilePath ?? "",
    bgmFilePath: chart.bgmFilePath ?? "",
    bgmPreviewStart: chart.bgmPreviewStart ?? 0,
    bgmPreviewStop: chart.bgmPreviewStop ?? 0,
    bgmManualOffset: chart.bgmManualOffset ?? 0,
    bgmRealOffset: chart.bgmRealOffset ?? 0,
    bgmEnableBarOffset: chart.bgmEnableBarOffset ?? false,
    bgmInitialBpm: chart.bgmInitialBpm ?? 0,
    bgmInitialNumerator: chart.bgmInitialNumerator ?? 4,
    bgmInitialDenominator: chart.bgmInitialDenominator ?? 4,
  };
}

export function applyMainDifficultyToBook(
  book: OptionScanBook,
  mainDifficulty: string,
): OptionScanBook {
  const charts = book.charts.map((chart) => ({
    ...chart,
    isMain: chart.difficulty === mainDifficulty,
  }));
  const main = chartFromBook({ ...book, charts }, mainDifficulty);
  if (!main) return { ...book, charts, mainDifficulty };

  return {
    ...book,
    ...bookFieldsFromChart(main),
    mainDifficulty,
    charts,
  };
}

export function collectMainDifficultyOverrides(
  books: OptionScanBook[],
): Array<{ songId: number; mainDifficulty: string }> {
  return books.flatMap((book) => {
    if (book.songId == null || !book.mainDifficulty) return [];
    return [{ songId: book.songId, mainDifficulty: book.mainDifficulty }];
  });
}
