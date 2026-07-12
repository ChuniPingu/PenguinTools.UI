import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import { THEME_SETTINGS, type ThemeSetting } from "@/lib/ui-settings";
import { cn } from "@/lib/utils";

const THEME_OPTION_META: Record<ThemeSetting, { icon: LucideIcon }> = {
  light: { icon: SunIcon },
  dark: { icon: MoonIcon },
  system: { icon: MonitorIcon },
};

export function ThemeSettingField() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [value, setValue] = useState<ThemeSetting | null>(null);
  const groupId = useId();

  useEffect(() => {
    if (!theme || !THEME_SETTINGS.includes(theme as ThemeSetting)) return;
    setValue(theme as ThemeSetting);
  }, [theme]);

  const handleChange = (nextValue: ThemeSetting) => {
    setValue(nextValue);
    setTheme(nextValue);
  };

  return (
    <Field>
      <FieldLabel id={`${groupId}-label`}>{t("ui.settings.theme.label")}</FieldLabel>
      {!value ? (
        <div
          aria-hidden
          className="h-9 w-full max-w-md animate-pulse rounded-lg border border-input bg-muted/50"
        />
      ) : (
        <RadioGroupPrimitive
          id={groupId}
          aria-labelledby={`${groupId}-label`}
          value={value}
          onValueChange={handleChange}
          className="inline-flex w-full max-w-md rounded-lg border border-input bg-muted/40 p-0.5"
        >
          {THEME_SETTINGS.map((option) => {
            const Icon = THEME_OPTION_META[option].icon;
            const label = t(`ui.settings.theme.options.${option}`);

            return (
              <RadioPrimitive.Root
                key={option}
                value={option}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors outline-none select-none",
                  "text-muted-foreground hover:text-foreground",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  "data-checked:bg-background data-checked:text-foreground data-checked:shadow-sm",
                  "dark:data-checked:bg-input/60",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </RadioPrimitive.Root>
            );
          })}
        </RadioGroupPrimitive>
      )}
    </Field>
  );
}
