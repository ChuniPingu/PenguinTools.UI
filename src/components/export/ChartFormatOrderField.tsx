import { PlusIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  CHART_FILE_DISCOVERY_FORMATS,
  parseChartFileDiscovery,
  serializeChartFileDiscovery,
} from "@/lib/chart-file-discovery";
import { cn } from "@/lib/utils";

export function ChartFormatOrderField({
  value,
  onChange,
  className,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const formats = parseChartFileDiscovery(value)
    .map((format) => format.toLowerCase())
    .filter(
      (format, index, entries) =>
        (CHART_FILE_DISCOVERY_FORMATS as readonly string[]).includes(format) &&
        entries.indexOf(format) === index,
    );
  const availableFormats = CHART_FILE_DISCOVERY_FORMATS.filter(
    (format) => !formats.includes(format),
  );

  const commit = (next: string[]) => onChange(serializeChartFileDiscovery(next));

  const remove = (format: string) => {
    commit(formats.filter((entry) => entry !== format));
  };

  return (
    <div
      className={cn(
        "flex min-h-7 max-w-full items-center gap-1.5 overflow-x-auto py-0.5",
        className,
      )}
    >
      {formats.map((format) => (
        <div
          key={format}
          className="flex h-7 shrink-0 items-center gap-0.5 rounded-md border bg-background px-1 shadow-xs"
        >
          <span className="px-1 font-mono text-xs">{format}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            className="size-6 text-muted-foreground"
            aria-label={t("ui.option.chartFormats.remove", { format })}
            onClick={() => remove(format)}
          >
            <XIcon />
          </Button>
        </div>
      ))}

      {availableFormats.map((format) => (
        <Button
          key={format}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 shrink-0 border-dashed px-2 font-mono text-xs font-normal text-muted-foreground"
          aria-label={t("ui.option.chartFormats.add", { format })}
          onClick={() => commit([...formats, format])}
        >
          <PlusIcon />
          {format}
        </Button>
      ))}
    </div>
  );
}
