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

function fieldLineKey(entry: ApplicationEntry): string {
  return `${entry.id}:${entry.name}`;
}

function formatFieldLineLabel(entry: ApplicationEntry): string {
  return `${entry.id} · ${entry.name}`;
}

function isSameFieldLine(a: ApplicationEntry, b: ApplicationEntry): boolean {
  return a.id === b.id && a.name === b.name;
}

export interface FieldLineComboboxProps {
  id?: string;
  className?: string;
  items: ApplicationEntry[];
  value: ApplicationEntry;
  onValueChange: (value: ApplicationEntry) => void;
}

export function FieldLineCombobox({
  id,
  className,
  items,
  value,
  onValueChange,
}: FieldLineComboboxProps) {
  const { t } = useTranslation();

  return (
    <Combobox
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      itemToStringLabel={formatFieldLineLabel}
      itemToStringValue={formatFieldLineLabel}
      isItemEqualToValue={isSameFieldLine}
    >
      <ComboboxInput
        id={id}
        className={className ?? "w-full"}
        placeholder={t("ui.properties.notesFieldLine.placeholder")}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("ui.properties.notesFieldLine.empty")}</ComboboxEmpty>
        <ComboboxList>
          {(entry) => (
            <ComboboxItem key={fieldLineKey(entry)} value={entry}>
              {formatFieldLineLabel(entry)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
