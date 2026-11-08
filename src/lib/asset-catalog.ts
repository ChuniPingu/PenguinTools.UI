import { t } from "@/i18n";
import type { ApplicationEntry } from "@/lib/cli-results";
import { pathExists, readTextFile } from "@/lib/app-fs";
import { joinPath } from "@/lib/paths";

export const USER_ASSETS_FILE = "assets.user.json";
export const HARD_ASSETS_FILE = "assets.json";

interface AssetJsonEntry {
  id?: number;
  str?: string;
  data?: string | null;
}

interface AssetDatabaseJson {
  genreNames?: AssetJsonEntry[];
  notesFieldLine?: AssetJsonEntry[];
  stageName?: AssetJsonEntry[];
  worldsEndTagName?: AssetJsonEntry[];
  releaseTagName?: AssetJsonEntry[];
}

export interface AssetCatalog {
  genreNames: ApplicationEntry[];
  fieldLines: ApplicationEntry[];
  stageNames: ApplicationEntry[];
  weTagNames: ApplicationEntry[];
  releaseTagNames: ApplicationEntry[];
  hasUserAssets: boolean;
}

export const EMPTY_CATALOG: AssetCatalog = {
  genreNames: [],
  fieldLines: [],
  stageNames: [],
  weTagNames: [],
  releaseTagNames: [],
  hasUserAssets: false,
};

function toEntry(raw: AssetJsonEntry): ApplicationEntry | null {
  if (typeof raw.id !== "number" || typeof raw.str !== "string") return null;
  return {
    id: raw.id,
    name: raw.str,
    data: raw.data ?? null,
  };
}

function parseDatabase(json: string): AssetDatabaseJson {
  const value: unknown = JSON.parse(json);
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(t("ui.assets.errors.invalidDatabase"));
  }
  const database = value as Record<string, unknown>;
  for (const key of [
    "genreNames",
    "notesFieldLine",
    "stageName",
    "worldsEndTagName",
    "releaseTagName",
  ]) {
    const entries = database[key];
    if (entries === undefined) continue;
    if (
      !Array.isArray(entries) ||
      !entries.every((entry: unknown) => {
        if (entry == null || typeof entry !== "object") return false;
        const raw = entry as Record<string, unknown>;
        return (
          typeof raw.id === "number" &&
          Number.isFinite(raw.id) &&
          typeof raw.str === "string" &&
          (raw.data == null || typeof raw.data === "string")
        );
      })
    )
      throw new Error(t("ui.assets.errors.invalidDatabase"));
  }
  return database as AssetDatabaseJson;
}

function entriesFrom(list: AssetJsonEntry[] | undefined): ApplicationEntry[] {
  if (!list?.length) return [];
  const result: ApplicationEntry[] = [];
  for (const raw of list) {
    const entry = toEntry(raw);
    if (entry) result.push(entry);
  }
  return result;
}

/** Union by id (later source wins on conflict). Mirrors C# MergeAssets hard ∪ user. */
function mergeEntries(...groups: ApplicationEntry[][]): ApplicationEntry[] {
  const map = new Map<number, ApplicationEntry>();
  for (const group of groups) {
    for (const entry of group) map.set(entry.id, entry);
  }
  return [...map.values()].sort((a, b) => a.id - b.id || a.name.localeCompare(b.name));
}

export function mergeAssetCatalogs(
  hard: AssetDatabaseJson,
  user: AssetDatabaseJson | null,
): Omit<AssetCatalog, "hasUserAssets"> {
  return {
    genreNames: mergeEntries(entriesFrom(hard.genreNames), entriesFrom(user?.genreNames)),
    fieldLines: mergeEntries(entriesFrom(hard.notesFieldLine), entriesFrom(user?.notesFieldLine)),
    stageNames: mergeEntries(entriesFrom(hard.stageName), entriesFrom(user?.stageName)),
    weTagNames: mergeEntries(
      entriesFrom(hard.worldsEndTagName),
      entriesFrom(user?.worldsEndTagName),
    ),
    releaseTagNames: mergeEntries(
      entriesFrom(hard.releaseTagName),
      entriesFrom(user?.releaseTagName),
    ),
  };
}

export function userAssetsPath(userDataDir: string) {
  return joinPath(userDataDir, USER_ASSETS_FILE);
}

export function hardAssetsPath(assetsDir: string) {
  return joinPath(assetsDir, HARD_ASSETS_FILE);
}

export async function loadAssetCatalog(
  assetsDir: string,
  userDataDir: string,
): Promise<{ catalog: AssetCatalog; errors: string[] }> {
  const errors: string[] = [];
  const readDatabase = async (
    path: string,
    optional: boolean,
  ): Promise<AssetDatabaseJson | null> => {
    try {
      if (optional && !(await pathExists(path))) return null;
      return parseDatabase(await readTextFile(path));
    } catch (error) {
      errors.push(
        t("ui.assets.notify.loadFailed", {
          path,
          reason: error instanceof Error ? error.message : String(error),
        }),
      );
      return null;
    }
  };
  const hard = await readDatabase(hardAssetsPath(assetsDir), false);
  const user = await readDatabase(userAssetsPath(userDataDir), true);
  return {
    catalog: { ...mergeAssetCatalogs(hard ?? {}, user), hasUserAssets: user !== null },
    errors,
  };
}
