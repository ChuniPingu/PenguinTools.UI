import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { LANGUAGE_SETTINGS, type LanguageSetting } from "@/lib/ui-settings";

export function LanguageSettingField() {
  const { i18n, t } = useTranslation();
  const inputId = useId();
  const value = LANGUAGE_SETTINGS.includes(i18n.resolvedLanguage as LanguageSetting)
    ? (i18n.resolvedLanguage as LanguageSetting)
    : "en";
  const languageLabel = (language: LanguageSetting) =>
    t(`ui.settings.language.options.${language}`);
  const handleValueChange = (nextValue: LanguageSetting | null) => {
    if (nextValue) void i18n.changeLanguage(nextValue);
  };

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{t("ui.settings.language.label")}</FieldLabel>
      <Combobox
        items={LANGUAGE_SETTINGS}
        value={value}
        onValueChange={handleValueChange}
        itemToStringLabel={languageLabel}
        itemToStringValue={languageLabel}
      >
        <ComboboxInput id={inputId} className="w-full max-w-md" />
        <ComboboxContent>
          <ComboboxEmpty>{t("ui.settings.language.empty")}</ComboboxEmpty>
          <ComboboxList>
            {(language) => (
              <ComboboxItem key={language} value={language}>
                {languageLabel(language)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
