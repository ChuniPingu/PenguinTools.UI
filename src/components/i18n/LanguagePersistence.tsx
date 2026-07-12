import { useEffect, useRef } from "react";
import i18n from "@/i18n";
import { useApp } from "@/contexts/AppContext";
import { isTauriRuntime } from "@/lib/tauri-cli";
import {
  LANGUAGE_SETTINGS,
  loadUiSettings,
  parseLanguageSetting,
  saveUiSettings,
  type LanguageSetting,
} from "@/lib/ui-settings";

export const LANGUAGE_STORAGE_KEY = "penguin-butler-language";

function readStoredLanguage(): LanguageSetting | null {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGE_SETTINGS.includes(value as LanguageSetting) ? (value as LanguageSetting) : null;
  } catch {
    return null;
  }
}

function storeLanguage(language: LanguageSetting) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

export function LanguagePersistence() {
  const { runtimeInfo } = useApp();
  const hydrated = useRef(false);
  const lastPersistedLanguage = useRef<LanguageSetting | null>(null);

  useEffect(() => {
    if (hydrated.current) return;

    const storedLanguage = readStoredLanguage();
    if (!isTauriRuntime()) {
      hydrated.current = true;
      if (storedLanguage) void i18n.changeLanguage(storedLanguage);
      return;
    }

    if (!runtimeInfo) return;

    let cancelled = false;
    void (async () => {
      const settings = await loadUiSettings(runtimeInfo.userDataDir);
      if (cancelled) return;

      const language = storedLanguage ?? settings.language;
      hydrated.current = true;
      lastPersistedLanguage.current = language;
      storeLanguage(language);
      await i18n.changeLanguage(language);

      if (storedLanguage && storedLanguage !== settings.language) {
        await saveUiSettings(runtimeInfo.userDataDir, { language: storedLanguage });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runtimeInfo]);

  useEffect(() => {
    const persistLanguage = (language: string) => {
      const nextLanguage = parseLanguageSetting(language);
      document.documentElement.lang = nextLanguage;
      if (!hydrated.current || lastPersistedLanguage.current === nextLanguage) return;

      lastPersistedLanguage.current = nextLanguage;
      storeLanguage(nextLanguage);
      if (isTauriRuntime() && runtimeInfo) {
        void saveUiSettings(runtimeInfo.userDataDir, { language: nextLanguage });
      }
    };

    i18n.on("languageChanged", persistLanguage);
    persistLanguage(i18n.resolvedLanguage ?? i18n.language ?? "en");
    return () => {
      i18n.off("languageChanged", persistLanguage);
    };
  }, [runtimeInfo]);

  return null;
}
