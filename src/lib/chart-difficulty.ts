export interface ChartDifficultyOption {
  id: number;
  label: string;
}

export interface WeDifficultyOption {
  id: number;
  label: string;
}

/** Matches PenguinTools.Core.Metadata.Difficulty enum order and display names. */
export const CHART_DIFFICULTY_OPTIONS: readonly ChartDifficultyOption[] = [
  { id: 0, label: "Basic" },
  { id: 1, label: "Advanced" },
  { id: 2, label: "Expert" },
  { id: 3, label: "Master" },
  { id: 4, label: "Ultima" },
  { id: 5, label: "WORLD'S END" },
] as const;

/** Matches PenguinTools.Core.Metadata.StarDifficulty enum values. */
export const WE_DIFFICULTY_OPTIONS: readonly WeDifficultyOption[] = [
  { id: 0, label: "N/A" },
  { id: 1, label: "1★" },
  { id: 3, label: "2★" },
  { id: 5, label: "3★" },
  { id: 7, label: "4★" },
  { id: 9, label: "5★" },
] as const;

const WORLDS_END_ALIASES = new Set(["worldsend", "world's end", "worlds end"]);

export function normalizeDifficultyName(difficulty: string): string {
  if (WORLDS_END_ALIASES.has(difficulty.trim().toLowerCase())) return "WORLD'S END";
  const byId = CHART_DIFFICULTY_OPTIONS.find(
    (option) => option.label.toLowerCase() === difficulty.trim().toLowerCase(),
  );
  if (byId) return byId.label;
  return difficulty;
}

export function isWorldsEndDifficulty(difficulty: string): boolean {
  return WORLDS_END_ALIASES.has(difficulty.trim().toLowerCase());
}

export function showsUnlockEventId(difficulty: string): boolean {
  const normalized = normalizeDifficultyName(difficulty);
  return normalized === "Ultima" || normalized === "WORLD'S END";
}

export function chartDifficultyLabel(id: number): string {
  return CHART_DIFFICULTY_OPTIONS.find((option) => option.id === id)?.label ?? String(id);
}

export function chartDifficultyIdFromName(difficulty: string): number | null {
  const normalized = normalizeDifficultyName(difficulty);
  return CHART_DIFFICULTY_OPTIONS.find((option) => option.label === normalized)?.id ?? null;
}

function normalizeStarLabel(value: string): string {
  const trimmed = value.trim();
  const compact = trimmed.replace(/[\s\uFE0F]/g, "");
  const numeric = /^(\d+)[★⭐]$/.exec(compact);
  if (numeric) return `${numeric[1]}★`;

  const characters = Array.from(compact);
  const stars = characters.filter((character) => character === "★" || character === "⭐");
  if (stars.length > 0 && stars.length === characters.length) {
    return `${stars.length}★`;
  }

  return trimmed;
}

export function formatWeDifficulty(id: number, fallback = ""): string {
  const option = WE_DIFFICULTY_OPTIONS.find((item) => item.id === id);
  if (option && option.id !== 0) return option.label;

  const normalizedFallback = normalizeStarLabel(fallback);
  return normalizedFallback || option?.label || String(id);
}

export function formatChartLevelLabel(
  difficulty: string,
  level: number,
  weDifficultyId?: number | null,
): string {
  if (isWorldsEndDifficulty(difficulty)) {
    const stars = formatWeDifficulty(weDifficultyId ?? 0, "");
    return stars && stars !== "N/A" ? stars : level.toFixed(1);
  }
  return level.toFixed(1);
}
