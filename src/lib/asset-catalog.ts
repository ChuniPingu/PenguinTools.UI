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
}

export interface AssetCatalog {
  genreNames: ApplicationEntry[];
  fieldLines: ApplicationEntry[];
  stageNames: ApplicationEntry[];
  weTagNames: ApplicationEntry[];
  hasUserAssets: boolean;
}

const EMPTY_CATALOG: AssetCatalog = {
  genreNames: [],
  fieldLines: [],
  stageNames: [],
  weTagNames: [],
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
  try {
    return JSON.parse(json) as AssetDatabaseJson;
  } catch {
    return {};
  }
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
): Promise<AssetCatalog> {
  const hardPath = hardAssetsPath(assetsDir);
  const userPath = userAssetsPath(userDataDir);

  let hardJson = "{}";
  try {
    hardJson = await readTextFile(hardPath);
  } catch {
    return { ...EMPTY_CATALOG };
  }

  const hasUser = await pathExists(userPath);
  let userDb: AssetDatabaseJson | null = null;
  if (hasUser) {
    try {
      userDb = parseDatabase(await readTextFile(userPath));
    } catch {
      userDb = null;
    }
  }

  return {
    ...mergeAssetCatalogs(parseDatabase(hardJson), userDb),
    hasUserAssets: hasUser && userDb != null,
  };
}
