import { changeExtension, musicBuildOutputDir, optionBuildOutputDir } from "@/lib/paths";

export interface CliProgressOptions {
  noProgress?: boolean;
}

function appendNoProgress(args: string[], options?: CliProgressOptions): string[] {
  if (options?.noProgress) {
    args.push("--no-progress");
  }
  return args;
}

export function chartInspectArgs(chartPath: string): string[] {
  return ["chart", "inspect", chartPath];
}

export function chartConvertArgs(
  chartPath: string,
  outputPath?: string,
  overrides?: {
    songId?: number;
    designer?: string;
    difficultyId?: number;
    mainBpm?: number;
    insertBlankMeasure?: boolean;
  },
  options?: CliProgressOptions,
): string[] {
  const output = outputPath ?? changeExtension(chartPath, ".c2s");
  const args = ["chart", "convert", chartPath, output];
  if (overrides?.songId != null) args.push("--song-id", String(overrides.songId));
  if (overrides?.designer != null) args.push("--designer", overrides.designer);
  if (overrides?.difficultyId != null) args.push("--difficulty-id", String(overrides.difficultyId));
  if (overrides?.mainBpm != null) args.push("--display-bpm", String(overrides.mainBpm));
  if (overrides?.insertBlankMeasure != null) {
    args.push(
      overrides.insertBlankMeasure ? "--insert-blank-measure" : "--no-insert-blank-measure",
    );
  }
  return appendNoProgress(args, options);
}

export interface MusicBuildSettings {
  jacketInputPath?: string;
  workingAudioPath?: string;
  hcaKey?: string;
  backgroundPath?: string;
  stageId?: number;
  notesFieldLineId?: number;
  notesFieldLineName?: string;
  notesFieldLineData?: string | null;
  songId?: number;
  title?: string;
  artist?: string;
  designer?: string;
  difficultyId?: number;
  level?: number;
  mainBpm?: number;
  insertBlankMeasure?: boolean;
  genreId?: number;
  genreName?: string;
  weTagId?: number;
  weTagName?: string;
  weDifficultyId?: number;
  isCustomStage?: boolean;
  stageEntryId?: number;
  stageEntryName?: string;
  previewStart?: number;
  previewStop?: number;
  manualOffset?: number;
  initialBpm?: number;
  initialNumerator?: number;
  initialDenominator?: number;
  sortName?: string;
  unlockEventId?: number;
  releaseDate?: string;
  mainTil?: number;
}

function appendValue(
  args: string[],
  flag: string,
  value: string | number | boolean | null | undefined,
) {
  if (value != null && value !== "") args.push(flag, String(value));
}

function appendFlag(args: string[], flag: string, enabled?: boolean) {
  if (enabled) args.push(flag);
}

export function musicBuildArgs(
  chartPath: string,
  outputDir?: string,
  settings: MusicBuildSettings = {},
  options?: CliProgressOptions,
): string[] {
  const output = outputDir ?? musicBuildOutputDir(chartPath);
  const args = ["music", "build", chartPath, output];
  appendValue(args, "--jacket-input", settings.jacketInputPath);
  appendValue(args, "--working-audio", settings.workingAudioPath);
  appendValue(args, "--hca-key", settings.hcaKey);
  appendValue(args, "--background", settings.backgroundPath);
  appendValue(args, "--stage-id", settings.stageId);
  appendValue(args, "--notes-field-line-id", settings.notesFieldLineId);
  appendValue(args, "--notes-field-line-name", settings.notesFieldLineName);
  appendValue(args, "--notes-field-line-data", settings.notesFieldLineData);
  appendValue(args, "--song-id", settings.songId);
  appendValue(args, "--title", settings.title);
  appendValue(args, "--artist", settings.artist);
  appendValue(args, "--designer", settings.designer);
  appendValue(args, "--difficulty-id", settings.difficultyId);
  appendValue(args, "--level", settings.level);
  appendValue(args, "--display-bpm", settings.mainBpm);
  if (settings.insertBlankMeasure != null) {
    args.push(settings.insertBlankMeasure ? "--insert-blank-measure" : "--no-insert-blank-measure");
  }
  appendValue(args, "--genre-id", settings.genreId);
  appendValue(args, "--genre-name", settings.genreName);
  appendValue(args, "--we-tag-id", settings.weTagId);
  appendValue(args, "--we-tag-name", settings.weTagName);
  appendValue(args, "--we-difficulty-id", settings.weDifficultyId);
  appendValue(args, "--custom-stage", settings.isCustomStage);
  appendValue(args, "--stage-entry-id", settings.stageEntryId);
  appendValue(args, "--stage-entry-name", settings.stageEntryName);
  appendValue(args, "--preview-start", settings.previewStart);
  appendValue(args, "--preview-stop", settings.previewStop);
  appendValue(args, "--manual-offset", settings.manualOffset);
  appendValue(args, "--initial-bpm", settings.initialBpm);
  appendValue(args, "--initial-numerator", settings.initialNumerator);
  appendValue(args, "--initial-denominator", settings.initialDenominator);
  appendValue(args, "--sort-name", settings.sortName);
  appendValue(args, "--unlock-event-id", settings.unlockEventId);
  appendValue(args, "--release-date", settings.releaseDate);
  appendValue(args, "--main-til", settings.mainTil);
  return appendNoProgress(args, options);
}

export function optionScanArgs(
  inputDir: string,
  settings?: { chartFileDiscovery?: string; batchSize?: number; saveConfig?: boolean },
  options?: CliProgressOptions,
): string[] {
  const args = ["option", "scan", inputDir];
  if (settings?.chartFileDiscovery) {
    args.push("--chart-file-discovery", settings.chartFileDiscovery);
  }
  if (settings?.batchSize != null) args.push("--batch-size", String(settings.batchSize));
  if (settings?.saveConfig) args.push("--save-config");
  return appendNoProgress(args, options);
}

export interface OptionBuildSettings {
  optionName?: string;
  configPath?: string;
  noConfig?: boolean;
  saveConfig?: boolean;
  convertChart?: boolean;
  convertAudio?: boolean;
  convertJacket?: boolean;
  convertBackground?: boolean;
  chartFileDiscovery?: string;
  batchSize?: number;
  hcaKey?: string;
  ignoreCache?: boolean;
  generateEventXml?: boolean;
  customReleaseTagXml?: boolean;
  selectedReleaseTagId?: number;
  customReleaseTagId?: number;
  customReleaseTagTitleName?: string;
  customGenre?: boolean;
  selectedGenreId?: number;
  customGenreId?: number;
  customGenreName?: string;
  overrideChartGenre?: boolean;
  ultimaEventId?: number;
  weEventId?: number;
  mainDifficulties?: Array<{ songId: number; mainDifficulty: string }>;
}

export function optionBuildArgs(
  inputDir: string,
  outputDir?: string,
  settings: OptionBuildSettings = {},
  options?: CliProgressOptions,
): string[] {
  const output = outputDir ?? optionBuildOutputDir(inputDir);
  const args = ["option", "build", inputDir, output];

  appendValue(args, "--config", settings.configPath);
  appendFlag(args, "--no-config", settings.noConfig);
  appendFlag(args, "--save-config", settings.saveConfig);
  appendValue(args, "--option-name", settings.optionName);
  appendValue(args, "--convert-chart", settings.convertChart);
  appendValue(args, "--convert-audio", settings.convertAudio);
  appendValue(args, "--convert-jacket", settings.convertJacket);
  appendValue(args, "--convert-background", settings.convertBackground);
  appendValue(args, "--chart-file-discovery", settings.chartFileDiscovery);
  appendValue(args, "--batch-size", settings.batchSize);
  appendValue(args, "--hca-key", settings.hcaKey);
  appendFlag(args, "--ignore-cache", settings.ignoreCache);
  appendValue(args, "--generate-event-xml", settings.generateEventXml);
  appendValue(args, "--custom-release-tag-xml", settings.customReleaseTagXml);
  appendValue(args, "--selected-release-tag-id", settings.selectedReleaseTagId);
  appendValue(args, "--custom-release-tag-id", settings.customReleaseTagId);
  appendValue(args, "--custom-release-tag-title-name", settings.customReleaseTagTitleName);
  appendValue(args, "--custom-genre", settings.customGenre);
  appendValue(args, "--selected-genre-id", settings.selectedGenreId);
  appendValue(args, "--custom-genre-id", settings.customGenreId);
  appendValue(args, "--custom-genre-name", settings.customGenreName);
  appendValue(args, "--override-chart-genre", settings.overrideChartGenre);
  appendValue(args, "--ultima-event-id", settings.ultimaEventId);
  appendValue(args, "--we-event-id", settings.weEventId);
  if (settings.mainDifficulties?.length) {
    for (const entry of settings.mainDifficulties) {
      args.push("--main-difficulty", `${entry.songId}:${entry.mainDifficulty}`);
    }
  }

  return appendNoProgress(args, options);
}

export function jacketFileConvertArgs(imagePath: string, outputPath: string): string[] {
  return ["jacket", "convert-file", imagePath, outputPath];
}

export interface AudioFileSettings {
  songId: number;
  previewStart: number;
  previewStop: number;
  manualOffset: number;
  insertBlankMeasure: boolean;
  initialBpm: number;
  initialNumerator: number;
  initialDenominator: number;
  hcaKey: string;
}

export function audioFileConvertArgs(
  audioPath: string,
  outputDir: string,
  settings: AudioFileSettings,
): string[] {
  const args = [
    "audio",
    "convert-file",
    audioPath,
    outputDir,
    "--song-id",
    String(settings.songId),
    "--preview-start",
    String(settings.previewStart),
    "--preview-stop",
    String(settings.previewStop),
    "--manual-offset",
    String(settings.manualOffset),
    "--initial-bpm",
    String(settings.initialBpm),
    "--initial-numerator",
    String(settings.initialNumerator),
    "--initial-denominator",
    String(settings.initialDenominator),
    "--hca-key",
    settings.hcaKey,
  ];
  appendFlag(args, "--insert-blank-measure", settings.insertBlankMeasure);
  return args;
}

export interface StageFilesSettings {
  stageId: number;
  effects: string[];
  notesFieldLineId: number;
  notesFieldLineName: string;
  notesFieldLineData?: string | null;
}

export function stageFilesBuildArgs(
  backgroundPath: string,
  outputDir: string,
  settings: StageFilesSettings,
): string[] {
  const args = [
    "stage",
    "build-files",
    backgroundPath,
    outputDir,
    "--stage-id",
    String(settings.stageId),
    "--notes-field-line-id",
    String(settings.notesFieldLineId),
    "--notes-field-line-name",
    settings.notesFieldLineName,
  ];
  appendValue(args, "--notes-field-line-data", settings.notesFieldLineData);
  settings.effects.slice(0, 4).forEach((path, index) => {
    if (path) args.push(`--effect-${index + 1}`, path);
  });
  return args;
}

export interface MusicExtractSettings {
  chartFormat?: "mgxc" | "ugc";
  hcaKey?: string;
  noAudio?: boolean;
  noJacket?: boolean;
}

export function musicExtractArgs(
  inputPath: string,
  outputDir: string,
  settings?: MusicExtractSettings,
  options?: CliProgressOptions,
): string[] {
  const args = ["music", "extract", inputPath, outputDir];
  if (settings?.chartFormat) args.push("--chart-format", settings.chartFormat);
  if (settings?.hcaKey) args.push("--hca-key", settings.hcaKey);
  if (settings?.noAudio) args.push("--no-audio");
  if (settings?.noJacket) args.push("--no-jacket");
  return appendNoProgress(args, options);
}

export interface AudioExtractSettings {
  pairedInput?: string;
  hcaKey?: string;
}

export function audioExtractArgs(
  inputPath: string,
  outputDir: string,
  settings?: AudioExtractSettings,
  options?: CliProgressOptions,
): string[] {
  const args = ["audio", "extract", inputPath, outputDir];
  if (settings?.pairedInput) args.push("--paired-input", settings.pairedInput);
  if (settings?.hcaKey) args.push("--hca-key", settings.hcaKey);
  return appendNoProgress(args, options);
}

export function stageExtractArgs(
  inputPath: string,
  outputDir: string,
  options?: CliProgressOptions,
): string[] {
  return appendNoProgress(["stage", "extract", inputPath, outputDir], options);
}

export function assetCollectArgs(
  gameRoot: string,
  outputPath: string,
  options?: CliProgressOptions,
): string[] {
  return appendNoProgress(["assets", "collect", gameRoot, "--output", outputPath], options);
}
