export const CHART_FILE_DISCOVERY_FORMATS = ["mgxc", "ugc", "sus"] as const;
export const DEFAULT_CHART_FILE_DISCOVERY = "[mgxc, ugc]";

const LEGACY_CHART_FILE_DISCOVERY_FORMATS: Record<number, string> = {
  0: "mgxc",
  1: "ugc",
  2: "sus",
};

export function parseChartFileDiscovery(value: string): string[] {
  const trimmed = value.trim();
  const body = trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1) : trimmed;

  return body
    .split(",")
    .map((format) => format.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

export function serializeChartFileDiscovery(formats: string[]): string {
  return `[${formats.join(", ")}]`;
}

export function normalizeChartFileDiscovery(formats: readonly unknown[]): string[] {
  const normalized = formats.flatMap((format) => {
    if (typeof format === "number") {
      const legacyFormat = LEGACY_CHART_FILE_DISCOVERY_FORMATS[format];
      return legacyFormat ? [legacyFormat] : [];
    }

    if (typeof format !== "string") return [];
    const name = format.toLowerCase();
    return CHART_FILE_DISCOVERY_FORMATS.includes(
      name as (typeof CHART_FILE_DISCOVERY_FORMATS)[number],
    )
      ? [name]
      : [];
  });

  return [...new Set(normalized)];
}

export function moveChartFormat(formats: string[], fromIndex: number, toIndex: number): string[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= formats.length ||
    toIndex >= formats.length
  ) {
    return formats;
  }

  const next = [...formats];
  const [format] = next.splice(fromIndex, 1);
  if (format == null) return formats;
  next.splice(toIndex, 0, format);
  return next;
}
