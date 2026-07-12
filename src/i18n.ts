import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import cliMessages from "@/locales/messages.en.json";
import cliMessagesZhHans from "@/locales/messages.zh-Hans.json";
import ui from "@/locales/ui.en.json";
import uiZhHans from "@/locales/ui.zh-Hans.json";

export const defaultNS = "translation";

const enTranslation = { ...cliMessages, ui };
const zhHansTranslation = { ...cliMessagesZhHans, ui: uiZhHans };

export const resources = {
  en: {
    translation: enTranslation,
  },
  "zh-Hans": {
    translation: zhHansTranslation,
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  defaultNS,
  returnNull: false,
  interpolation: {
    escapeValue: false,
    prefix: "{",
    suffix: "}",
  },
});

export const t = i18n.t.bind(i18n);

function parseLocaleFile(file: string): { bundleName: string; lang: string } | null {
  const normalized = file.replace(/\\/g, "/");
  const match = normalized.match(/locales\/([^/]+)\.([^.]+)\.json$/);
  if (!match) return null;
  return { bundleName: match[1]!, lang: match[2]! };
}

function toResourceBundle(
  bundleName: string,
  parsed: Record<string, unknown>,
): Record<string, unknown> {
  if (bundleName === "ui") {
    return { ui: parsed };
  }
  return parsed;
}

if (import.meta.hot) {
  import.meta.hot.on(
    "i18n-update",
    async ({ file, content }: { file: string; content: string }) => {
      const parsed = parseLocaleFile(file);
      if (!parsed) return;

      const { bundleName, lang } = parsed;
      const resources = toResourceBundle(
        bundleName,
        JSON.parse(content) as Record<string, unknown>,
      );

      i18n.addResourceBundle(lang, defaultNS, resources, true, true);
      await i18n.reloadResources(lang, defaultNS);
      await i18n.changeLanguage(i18n.language);
    },
  );
}

export default i18n;
