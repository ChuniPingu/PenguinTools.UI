import { getBaseName, getStem, joinPath } from "@/lib/paths";

export const CHART_EXTENSIONS = ["mgxc", "ugc", "sus", "c2s"] as const;
export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "bmp", "webp"] as const;
export const AUDIO_EXTENSIONS = ["wav", "ogg", "mp3"] as const;

export type ConvertFileKind = "chart" | "image" | "audio" | "unknown";

export function getExtension(path: string): string {
  const name = getBaseName(path);
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

export function classifyConvertFile(path: string): ConvertFileKind {
  const extension = getExtension(path);
  if ((CHART_EXTENSIONS as readonly string[]).includes(extension)) return "chart";
  if ((IMAGE_EXTENSIONS as readonly string[]).includes(extension)) return "image";
  if ((AUDIO_EXTENSIONS as readonly string[]).includes(extension)) return "audio";
  return "unknown";
}

export function chartOutputExtension(path: string): ".c2s" | ".ugc" {
  return getExtension(path) === "c2s" ? ".ugc" : ".c2s";
}

export function chartOutputName(chartPath: string, songId: string, difficultyId: number): string {
  if (getExtension(chartPath) === "c2s") return `${getStem(chartPath)}.ugc`;
  const left = songId.trim() ? Number(songId).toString().padStart(4, "0") : getStem(chartPath);
  return `${left}_${difficultyId.toString().padStart(2, "0")}.c2s`;
}

export function jacketOutputName(imagePath: string, jacketId: string): string {
  const value = jacketId.trim();
  const suffix = value ? Number(value).toString().padStart(4, "0") : getStem(imagePath);
  return `CHU_UI_Jacket_${suffix}.dds`;
}

export function suggestedPath(sourcePath: string, fileName: string): string {
  const separatorIndex = Math.max(sourcePath.lastIndexOf("/"), sourcePath.lastIndexOf("\\"));
  const directory = separatorIndex >= 0 ? sourcePath.slice(0, separatorIndex) : "";
  return joinPath(directory, fileName);
}

export interface AudioTimingValues {
  manualOffset: number;
  insertBlankMeasure: boolean;
  initialBpm: number;
  initialNumerator: number;
  initialDenominator: number;
}

export function calculateAudioTiming(values: AudioTimingValues): {
  barOffset: number;
  realOffset: number;
} {
  const { manualOffset, insertBlankMeasure, initialBpm, initialNumerator, initialDenominator } =
    values;
  if (initialBpm <= 0 || initialNumerator <= 0 || initialDenominator <= 0) {
    return { barOffset: 0, realOffset: manualOffset };
  }
  const barOffset = (60 / initialBpm) * initialNumerator * (4 / initialDenominator);
  return { barOffset, realOffset: manualOffset + (insertBlankMeasure ? barOffset : 0) };
}
