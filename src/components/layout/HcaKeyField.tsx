import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PropertyRow } from "@/components/layout/PropertyRow";
import { DEFAULT_HCA_KEY } from "@/stores/tool-page-store";
import { cn } from "@/lib/utils";

export function HcaKeyField({
  id,
  value,
  onChange,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const differsFromDefault = value !== DEFAULT_HCA_KEY;

  return (
    <PropertyRow
      label={t("ui.properties.hcaKey.label")}
      description={t("ui.properties.hcaKey.description")}
      htmlFor={id}
    >
      <div className={cn("flex max-w-xl items-center gap-2", className)}>
        <Input
          id={id}
          className="min-w-0 flex-1 font-mono"
          value={value}
          inputMode="numeric"
          onChange={(event) => onChange(event.target.value)}
        />
        {differsFromDefault ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onChange(DEFAULT_HCA_KEY)}
          >
            {t("ui.properties.hcaKey.reset")}
          </Button>
        ) : null}
      </div>
    </PropertyRow>
  );
}
