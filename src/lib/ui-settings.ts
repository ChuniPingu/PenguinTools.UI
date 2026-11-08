import { pathExists, readTextFile, writeTextFile } from "@/lib/app-fs";
import { joinPath } from "@/lib/paths";
import { t } from "@/i18n";

export const UI_SETTINGS_FILE = "ui-settings.json";

export const THEME_SETTINGS = ["light", "dark", "system"] as const;
export type ThemeSetting = (typeof THEME_SETTINGS)[number];

export const LANGUAGE_SETTINGS = ["en", "zh-Hans"] as const;
export type LanguageSetting = (typeof LANGUAGE_SETTINGS)[number];

export interface UiSettings {
  gameDirectory: string;
  theme: ThemeSetting;
  language: LanguageSetting;
  autoUpdate: boolean;
}

const DEFAULT_SETTINGS: UiSettings = {
  gameDirectory: "",
  theme: "system",
  language: "en",
  autoUpdate: true,
};

function parseThemeSetting(value: unknown): ThemeSetting {
  return THEME_SETTINGS.includes(value as ThemeSetting)
    ? (value as ThemeSetting)
    : DEFAULT_SETTINGS.theme;
}

export function parseLanguageSetting(value: unknown): LanguageSetting {
  return LANGUAGE_SETTINGS.includes(value as LanguageSetting)
    ? (value as LanguageSetting)
    : DEFAULT_SETTINGS.language;
}

export function tryParseLanguageSetting(value: unknown): LanguageSetting | null {
  return LANGUAGE_SETTINGS.includes(value as LanguageSetting) ? (value as LanguageSetting) : null;
}

function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

/** Map BCP 47 tags to a supported UI language. Any Chinese tag maps to zh-Hans. */
export function detectSystemLanguage(
  preferredLanguages: readonly string[] = browserLanguages(),
): LanguageSetting {
  for (const tag of preferredLanguages) {
    const normalized = tag.toLowerCase().replace(/_/g, "-");
    if (normalized === "zh" || normalized.startsWith("zh-")) {
      return "zh-Hans";
    }
  }
  return "en";
}

export function uiSettingsPath(userDataDir: string) {
  return joinPath(userDataDir, UI_SETTINGS_FILE);
}

async function readSettingsDocument(userDataDir: string): Promise<Partial<UiSettings>> {
  const path = uiSettingsPath(userDataDir);
  if (!(await pathExists(path))) return {};
  const value: unknown = JSON.parse(await readTextFile(path));
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(t("ui.common.notify.invalidSettings", { path }));
  }
  return value as Partial<UiSettings>;
}

/** Returns the language written in ui-settings.json, or null if unset / missing. */
export async function readPersistedLanguage(userDataDir: string): Promise<LanguageSetting | null> {
  const path = uiSettingsPath(userDataDir);
  if (!(await pathExists(path))) return null;
  try {
    const raw = JSON.parse(await readTextFile(path)) as Partial<UiSettings>;
    return tryParseLanguageSetting(raw.language);
  } catch {
    return null;
  }
}

export async function loadUiSettings(userDataDir: string): Promise<UiSettings> {
  const path = uiSettingsPath(userDataDir);
  if (!(await pathExists(path))) return { ...DEFAULT_SETTINGS };
  try {
    const raw = JSON.parse(await readTextFile(path)) as Partial<UiSettings>;
    return {
      gameDirectory: typeof raw.gameDirectory === "string" ? raw.gameDirectory : "",
      theme: parseThemeSetting(raw.theme),
      language: parseLanguageSetting(raw.language),
      autoUpdate:
        typeof raw.autoUpdate === "boolean" ? raw.autoUpdate : DEFAULT_SETTINGS.autoUpdate,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let pendingSave: Promise<void> = Promise.resolve();

export function saveUiSettings(userDataDir: string, patch: Partial<UiSettings>): Promise<void> {
  // Keep the read/merge/write together so independent settings controls cannot
  // overwrite each other's patches. A failed save must not block later saves.
  pendingSave = pendingSave
    .catch(() => {})
    .then(async () => {
      // Saving must not turn a read/parse failure into defaults and overwrite
      // the existing file. Retain unknown fields written by newer versions too.
      const current = await readSettingsDocument(userDataDir);
      await writeTextFile(
        uiSettingsPath(userDataDir),
        `${JSON.stringify({ ...DEFAULT_SETTINGS, ...current, ...patch }, null, 2)}\n`,
      );
    });
  return pendingSave;
}
