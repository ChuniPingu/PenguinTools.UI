import type { CSSProperties } from "react";
import { isWorldsEndDifficulty, normalizeDifficultyName } from "@/lib/chart-difficulty";

type DifficultyTone = "darker" | "dark" | "normal";

const DIFFICULTY_TONES: Record<string, Record<DifficultyTone, string>> = {
  Basic: { darker: "#407534", dark: "#325c29", normal: "#5ca94b" },
  Advanced: { darker: "#ad772b", dark: "#936624", normal: "#e09b38" },
  Expert: { darker: "#96253d", dark: "#7d1f32", normal: "#ca3252" },
  Master: { darker: "#742696", dark: "#601f7d", normal: "#9c33ca" },
  Ultima: { darker: "#ae2f35", dark: "#94282d", normal: "#e13d45" },
};

export function difficultyTextStyle(
  difficulty: string,
  tone: DifficultyTone = "darker",
): CSSProperties | undefined {
  const normalized = normalizeDifficultyName(difficulty);
  if (isWorldsEndDifficulty(normalized)) {
    const stops =
      tone === "normal"
        ? ["#cc0000", "#cc6600", "#cccc00", "#009933", "#0000cc"]
        : tone === "dark"
          ? ["#a30000", "#a35200", "#a3a300", "#007a29", "#0000a3"]
          : ["#7a0000", "#7a3d00", "#7a7a00", "#005b1e", "#00007a"];
    return {
      backgroundImage: `linear-gradient(90deg, ${stops.join(", ")})`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    };
  }

  const palette = DIFFICULTY_TONES[difficulty];
  if (!palette) return undefined;
  return { color: palette[tone] };
}

export function difficultyTextClass(difficulty: string, tone: DifficultyTone = "darker"): string {
  const normalized = normalizeDifficultyName(difficulty);
  if (isWorldsEndDifficulty(normalized)) return "";
  switch (normalized) {
    case "Basic":
      return tone === "normal"
        ? "text-[#5ca94b]"
        : tone === "dark"
          ? "text-[#325c29]"
          : "text-[#407534]";
    case "Advanced":
      return tone === "normal"
        ? "text-[#e09b38]"
        : tone === "dark"
          ? "text-[#936624]"
          : "text-[#ad772b]";
    case "Expert":
      return tone === "normal"
        ? "text-[#ca3252]"
        : tone === "dark"
          ? "text-[#7d1f32]"
          : "text-[#96253d]";
    case "Master":
      return tone === "normal"
        ? "text-[#9c33ca]"
        : tone === "dark"
          ? "text-[#601f7d]"
          : "text-[#742696]";
    case "Ultima":
      return tone === "normal"
        ? "text-[#e13d45]"
        : tone === "dark"
          ? "text-[#94282d]"
          : "text-[#ae2f35]";
    default:
      return "text-foreground";
  }
}
