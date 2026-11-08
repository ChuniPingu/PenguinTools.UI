import { useTranslation } from "react-i18next";
import { PropertyRow } from "@/components/layout/PropertyRow";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

const formats = ["mgxc", "ugc"] as const;
export type EditorChartFormat = (typeof formats)[number];
const formatLabel = (format: EditorChartFormat) => format.toUpperCase();

export function EditorChartFormatField({
  id,
  value,
  onChange,
}: Readonly<{
  id: string;
  value: EditorChartFormat;
  onChange: (format: EditorChartFormat) => void;
}>) {
  const { t } = useTranslation();
  return (
    <PropertyRow label={t("ui.properties.chartFormat.label")} htmlFor={id}>
      <Combobox
        items={formats}
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next);
        }}
        itemToStringLabel={formatLabel}
        itemToStringValue={formatLabel}
      >
        <ComboboxInput id={id} className="w-full max-w-md" readOnly />
        <ComboboxContent>
          <ComboboxList>
            {(format) => (
              <ComboboxItem key={format} value={format}>
                {formatLabel(format)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </PropertyRow>
  );
}
