import type { ApplicationEntry } from "@/lib/cli-results";

export type AssetMetaKind = "genre" | "fieldLine" | "stage" | "weTag";

export const ASSET_CATEGORIES: readonly AssetMetaKind[] = [
  "genre",
  "fieldLine",
  "stage",
  "weTag",
] as const;

export const DEFAULT_ASSET_CATEGORY: AssetMetaKind = "genre";

export function assetCategoryForCatalog(value: unknown): AssetMetaKind | undefined {
  switch (value) {
    case "genreNames":
      return "genre";
    case "notesFieldLine":
      return "fieldLine";
    case "stageName":
      return "stage";
    case "worldsEndTagName":
      return "weTag";
    default:
      return undefined;
  }
}

export function isAssetCategory(value: string | undefined): value is AssetMetaKind {
  return ASSET_CATEGORIES.includes(value as AssetMetaKind);
}

export function assetPagePath(category: AssetMetaKind = DEFAULT_ASSET_CATEGORY): string {
  return `/assets/${category}`;
}

const META_DIRECTIVES: Record<AssetMetaKind, string> = {
  genre: "genre",
  fieldLine: "fline",
  stage: "stage",
  weTag: "wetag",
};

/** Format an asset entry as a chart Comment `#meta` directive. */
export function formatAssetMetaDirective(kind: AssetMetaKind, entry: ApplicationEntry): string {
  return `#meta ${META_DIRECTIVES[kind]} ${entry.id}`;
}
