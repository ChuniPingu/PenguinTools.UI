import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { normalizeDifficultyName } from "@/lib/chart-difficulty";

export interface DifficultyOption {
  id: number;
  label: string;
}

export interface DifficultyComboboxProps {
  id?: string;
  className?: string;
  items: readonly DifficultyOption[];
  value: number;
  onValueChange: (id: number) => void;
  variant?: "chart" | "we";
}

function isSameDifficultyOption(a: DifficultyOption, b: DifficultyOption): boolean {
  return a.id === b.id;
}

function useDifficultyLabels(variant: "chart" | "we") {
  const { t } = useTranslation();
  if (variant === "we") {
    return {
      placeholder: t("ui.chart.preview.weDifficultyPlaceholder"),
      empty: t("ui.chart.preview.weDifficultyEmpty"),
    };
  }
  return {
    placeholder: t("ui.chart.fields.difficultyPlaceholder"),
    empty: t("ui.chart.fields.difficultyEmpty"),
  };
}

export function DifficultyCombobox({
  id,
  className,
  items,
  value,
  onValueChange,
  variant = "chart",
}: DifficultyComboboxProps) {
  const labels = useDifficultyLabels(variant);
  const selected = useMemo(
    () => items.find((option) => option.id === value) ?? { id: value, label: String(value) },
    [items, value],
  );
  const allItems = useMemo(() => {
    if (items.some((option) => option.id === value)) return items;
    return [selected, ...items];
  }, [items, selected, value]);

  return (
    <Combobox
      items={allItems}
      value={selected}
      onValueChange={(next) => {
        if (next) onValueChange(next.id);
      }}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.label}
      isItemEqualToValue={isSameDifficultyOption}
    >
      <ComboboxInput id={id} className={className ?? "w-full"} placeholder={labels.placeholder} />
      <ComboboxContent>
        <ComboboxEmpty>{labels.empty}</ComboboxEmpty>
        <ComboboxList>
          {(option) => (
            <ComboboxItem key={option.id} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export interface MainDifficultyComboboxProps {
  id?: string;
  className?: string;
  items: readonly string[];
  value: string;
  onValueChange: (value: string) => void;
}

export function MainDifficultyCombobox({
  id,
  className,
  items,
  value,
  onValueChange,
}: MainDifficultyComboboxProps) {
  const { t } = useTranslation();
  const allItems = useMemo(() => {
    if (!value || items.includes(value)) return items;
    return [value, ...items];
  }, [items, value]);

  return (
    <Combobox
      items={allItems}
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      itemToStringLabel={normalizeDifficultyName}
      itemToStringValue={(item) => item}
    >
      <ComboboxInput
        id={id}
        className={className ?? "w-full"}
        placeholder={t("ui.option.preview.mainDifficultyPlaceholder")}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("ui.option.preview.mainDifficultyEmpty")}</ComboboxEmpty>
        <ComboboxList>
          {(difficulty) => (
            <ComboboxItem key={difficulty} value={difficulty}>
              {normalizeDifficultyName(difficulty)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
