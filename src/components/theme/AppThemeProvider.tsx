import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, useRef, type ReactNode } from "react";
import { useApp } from "@/contexts/AppContext";
import { isTauriRuntime } from "@/lib/tauri-cli";
import {
  loadUiSettings,
  saveUiSettings,
  THEME_SETTINGS,
  type ThemeSetting,
} from "@/lib/ui-settings";

export const THEME_STORAGE_KEY = "penguin-butler-theme";

function syncThemeToStorage(theme: ThemeSetting) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

function ThemePersistence() {
  const { runtimeInfo } = useApp();
  const { theme, setTheme } = useTheme();
  const hydrated = useRef(false);
  const lastPersistedTheme = useRef<ThemeSetting | null>(null);
  const setThemeRef = useRef(setTheme);
  setThemeRef.current = setTheme;

  useEffect(() => {
    if (hydrated.current) return;

    if (!isTauriRuntime()) {
      hydrated.current = true;
      return;
    }

    if (!runtimeInfo) return;

    let cancelled = false;
    void (async () => {
      const settings = await loadUiSettings(runtimeInfo.userDataDir);
      if (cancelled) return;

      hydrated.current = true;
      lastPersistedTheme.current = settings.theme;

      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        setThemeRef.current(settings.theme);
        syncThemeToStorage(settings.theme);
        return;
      }

      const storedTheme = stored as ThemeSetting;
      if (THEME_SETTINGS.includes(storedTheme) && storedTheme !== settings.theme) {
        lastPersistedTheme.current = storedTheme;
        await saveUiSettings(runtimeInfo.userDataDir, { theme: storedTheme });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runtimeInfo]);

  useEffect(() => {
    if (!hydrated.current || !theme) return;

    const next = theme as ThemeSetting;
    if (!THEME_SETTINGS.includes(next)) return;
    if (lastPersistedTheme.current === next) return;

    lastPersistedTheme.current = next;

    if (!isTauriRuntime() || !runtimeInfo) return;
    void saveUiSettings(runtimeInfo.userDataDir, { theme: next });
  }, [runtimeInfo, theme]);

  return null;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      <ThemePersistence />
      {children}
    </NextThemesProvider>
  );
}
