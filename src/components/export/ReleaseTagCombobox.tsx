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

function releaseTagKey(entry: ApplicationEntry): string {
  return `${entry.id}:${entry.name}`;
}

function formatReleaseTagLabel(entry: ApplicationEntry): string {
  return `${entry.id} · ${entry.name}`;
}

function isSameReleaseTag(a: ApplicationEntry, b: ApplicationEntry): boolean {
  return a.id === b.id && a.name === b.name;
}

export interface ReleaseTagComboboxProps {
  id?: string;
  className?: string;
  items: ApplicationEntry[];
  value: ApplicationEntry;
  onValueChange: (value: ApplicationEntry) => void;
}

export function ReleaseTagCombobox({
  id,
  className,
  items,
  value,
  onValueChange,
}: Readonly<ReleaseTagComboboxProps>) {
  const { t } = useTranslation();

  return (
    <Combobox
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      itemToStringLabel={formatReleaseTagLabel}
      itemToStringValue={formatReleaseTagLabel}
      isItemEqualToValue={isSameReleaseTag}
    >
      <ComboboxInput
        id={id}
        className={className ?? "w-full"}
        placeholder={t("ui.properties.releaseTag.placeholder")}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("ui.properties.releaseTag.empty")}</ComboboxEmpty>
        <ComboboxList>
          {(entry) => (
            <ComboboxItem key={releaseTagKey(entry)} value={entry}>
              {formatReleaseTagLabel(entry)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
