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

export function musicBuildArgs(
  chartPath: string,
  outputDir?: string,
  settings: MusicBuildSettings = {},
  options?: CliProgressOptions,
): string[] {
  const output = outputDir ?? musicBuildOutputDir(chartPath);
  const args = ["music", "build", chartPath, output];
  if (settings.jacketInputPath) args.push("--jacket-input", settings.jacketInputPath);
  if (settings.workingAudioPath) args.push("--working-audio", settings.workingAudioPath);
  if (settings.hcaKey) args.push("--hca-key", settings.hcaKey);
  if (settings.backgroundPath) args.push("--background", settings.backgroundPath);
  if (settings.stageId != null) args.push("--stage-id", String(settings.stageId));
  if (settings.notesFieldLineId != null) {
    args.push("--notes-field-line-id", String(settings.notesFieldLineId));
  }
  if (settings.notesFieldLineName) {
    args.push("--notes-field-line-name", settings.notesFieldLineName);
  }
  if (settings.notesFieldLineData) {
    args.push("--notes-field-line-data", settings.notesFieldLineData);
  }
  if (settings.songId != null) args.push("--song-id", String(settings.songId));
  if (settings.title) args.push("--title", settings.title);
  if (settings.artist) args.push("--artist", settings.artist);
  if (settings.designer) args.push("--designer", settings.designer);
  if (settings.difficultyId != null) args.push("--difficulty-id", String(settings.difficultyId));
  if (settings.level != null) args.push("--level", String(settings.level));
  if (settings.mainBpm != null) args.push("--display-bpm", String(settings.mainBpm));
  if (settings.insertBlankMeasure != null) {
    args.push(settings.insertBlankMeasure ? "--insert-blank-measure" : "--no-insert-blank-measure");
  }
  if (settings.genreId != null) args.push("--genre-id", String(settings.genreId));
  if (settings.genreName) args.push("--genre-name", settings.genreName);
  if (settings.weTagId != null) args.push("--we-tag-id", String(settings.weTagId));
  if (settings.weTagName) args.push("--we-tag-name", settings.weTagName);
  if (settings.weDifficultyId != null) {
    args.push("--we-difficulty-id", String(settings.weDifficultyId));
  }
  if (settings.isCustomStage != null) args.push("--custom-stage", String(settings.isCustomStage));
  if (settings.stageEntryId != null) args.push("--stage-entry-id", String(settings.stageEntryId));
  if (settings.stageEntryName) args.push("--stage-entry-name", settings.stageEntryName);
  if (settings.previewStart != null) args.push("--preview-start", String(settings.previewStart));
  if (settings.previewStop != null) args.push("--preview-stop", String(settings.previewStop));
  if (settings.manualOffset != null) args.push("--manual-offset", String(settings.manualOffset));
  if (settings.initialBpm != null) args.push("--initial-bpm", String(settings.initialBpm));
  if (settings.initialNumerator != null) {
    args.push("--initial-numerator", String(settings.initialNumerator));
  }
  if (settings.initialDenominator != null) {
    args.push("--initial-denominator", String(settings.initialDenominator));
  }
  if (settings.sortName) args.push("--sort-name", settings.sortName);
  if (settings.unlockEventId != null)
    args.push("--unlock-event-id", String(settings.unlockEventId));
  if (settings.releaseDate) args.push("--release-date", settings.releaseDate);
  if (settings.mainTil != null) args.push("--main-til", String(settings.mainTil));
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
  generateReleaseTagXml?: boolean;
  releaseTagId?: number;
  releaseTagTitleName?: string;
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

  if (settings.configPath) {
    args.push("--config", settings.configPath);
  }
  if (settings.noConfig) {
    args.push("--no-config");
  }
  if (settings.saveConfig) {
    args.push("--save-config");
  }
  if (settings.optionName) {
    args.push("--option-name", settings.optionName);
  }
  if (settings.convertChart != null) {
    args.push("--convert-chart", String(settings.convertChart));
  }
  if (settings.convertAudio != null) {
    args.push("--convert-audio", String(settings.convertAudio));
  }
  if (settings.convertJacket != null) {
    args.push("--convert-jacket", String(settings.convertJacket));
  }
  if (settings.convertBackground != null) {
    args.push("--convert-background", String(settings.convertBackground));
  }
  if (settings.chartFileDiscovery) args.push("--chart-file-discovery", settings.chartFileDiscovery);
  if (settings.batchSize != null) args.push("--batch-size", String(settings.batchSize));
  if (settings.hcaKey) args.push("--hca-key", settings.hcaKey);
  if (settings.ignoreCache) args.push("--ignore-cache");
  if (settings.generateEventXml != null) {
    args.push("--generate-event-xml", String(settings.generateEventXml));
  }
  if (settings.generateReleaseTagXml != null) {
    args.push("--generate-release-tag-xml", String(settings.generateReleaseTagXml));
  }
  if (settings.releaseTagId != null) args.push("--release-tag-id", String(settings.releaseTagId));
  if (settings.releaseTagTitleName) {
    args.push("--release-tag-title-name", settings.releaseTagTitleName);
  }
  if (settings.ultimaEventId != null) {
    args.push("--ultima-event-id", String(settings.ultimaEventId));
  }
  if (settings.weEventId != null) args.push("--we-event-id", String(settings.weEventId));
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
  if (settings.insertBlankMeasure) args.push("--insert-blank-measure");
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
  if (settings.notesFieldLineData) {
    args.push("--notes-field-line-data", settings.notesFieldLineData);
  }
  settings.effects.slice(0, 4).forEach((path, index) => {
    if (path) args.push(`--effect-${index + 1}`, path);
  });
  return args;
}

export interface MusicExtractSettings {
  jacketPath?: string;
  acbPath?: string;
  awbPath?: string;
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
  if (settings?.jacketPath) args.push("--jacket", settings.jacketPath);
  if (settings?.acbPath) args.push("--acb", settings.acbPath);
  if (settings?.awbPath) args.push("--awb", settings.awbPath);
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

export function afbExtractArgs(
  inputPath: string,
  outputDir: string,
  options?: CliProgressOptions,
): string[] {
  return appendNoProgress(["afb", "extract", inputPath, outputDir], options);
}

export function assetCollectArgs(
  gameRoot: string,
  outputPath: string,
  options?: CliProgressOptions,
): string[] {
  return appendNoProgress(["assets", "collect", gameRoot, "--output", outputPath], options);
}
