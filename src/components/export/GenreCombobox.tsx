import { useTranslation } from "react-i18next";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { ApplicationEntry } from "@/lib/cli-results";

function genreKey(entry: ApplicationEntry): string {
  return `${entry.id}:${entry.name}`;
}

function formatGenreLabel(entry: ApplicationEntry): string {
  return `${entry.id} · ${entry.name}`;
}

function isSameGenre(a: ApplicationEntry, b: ApplicationEntry): boolean {
  return a.id === b.id && a.name === b.name;
}

export interface GenreComboboxProps {
  id?: string;
  className?: string;
  items: ApplicationEntry[];
  value: ApplicationEntry;
  onValueChange: (value: ApplicationEntry) => void;
}

export function GenreCombobox({
  id,
  className,
  items,
  value,
  onValueChange,
}: Readonly<GenreComboboxProps>) {
  const { t } = useTranslation();

  return (
    <Combobox
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      itemToStringLabel={formatGenreLabel}
      itemToStringValue={formatGenreLabel}
      isItemEqualToValue={isSameGenre}
    >
      <ComboboxInput
        id={id}
        className={className ?? "w-full"}
        placeholder={t("ui.properties.genre.placeholder")}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("ui.properties.genre.empty")}</ComboboxEmpty>
        <ComboboxList>
          {(entry) => (
            <ComboboxItem key={genreKey(entry)} value={entry}>
              {formatGenreLabel(entry)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
