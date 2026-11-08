import { useTranslation } from "react-i18next";
import { IntegerInput } from "@/components/ui/numeric-input";
import { normalizeTimeSignaturePart } from "@/lib/convert-files";
import { cn } from "@/lib/utils";

export function TimeSignatureInput({
  id,
  labelId,
  numerator,
  denominator,
  className,
  onChange,
}: Readonly<{
  id?: string;
  labelId?: string;
  numerator: string;
  denominator: string;
  className?: string;
  onChange: (values: { numerator: string; denominator: string }) => void;
}>) {
  const { t } = useTranslation();
  const numeratorId = id ? `${id}-numerator` : undefined;
  const denominatorId = id ? `${id}-denominator` : undefined;

  return (
    <fieldset
      aria-labelledby={labelId}
      className={cn("flex max-w-md items-center gap-2", className)}
    >
      <IntegerInput
        id={numeratorId}
        className="w-16 text-center font-mono tabular-nums"
        value={numerator}
        maxLength={2}
        inputMode="numeric"
        placeholder="4"
        aria-label={t("ui.properties.timeSignature.numerator")}
        onChange={(event) => onChange({ numerator: event.target.value, denominator })}
        onBlur={() => {
          const normalized = normalizeTimeSignaturePart(numerator);
          if (normalized !== numerator) {
            onChange({ numerator: normalized, denominator });
          }
        }}
      />
      <span className="text-sm text-muted-foreground select-none" aria-hidden="true">
        /
      </span>
      <IntegerInput
        id={denominatorId}
        className="w-16 text-center font-mono tabular-nums"
        value={denominator}
        maxLength={2}
        inputMode="numeric"
        placeholder="4"
        aria-label={t("ui.properties.timeSignature.denominator")}
        onChange={(event) => onChange({ numerator, denominator: event.target.value })}
        onBlur={() => {
          const normalized = normalizeTimeSignaturePart(denominator);
          if (normalized !== denominator) {
            onChange({ numerator, denominator: normalized });
          }
        }}
      />
    </fieldset>
  );
}
