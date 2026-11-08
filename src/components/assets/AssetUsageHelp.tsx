import { useTranslation } from "react-i18next";
import { HelpScreenshot } from "@/components/help/HelpScreenshot";
import { HelpSteps } from "@/components/help/HelpSteps";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export function AssetUsageHelp() {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger className="text-xs font-medium text-primary underline underline-offset-2 hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2">
        {t("ui.assets.help.trigger")}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(23rem,calc(100vw-2rem))]">
        <PopoverTitle className="sr-only">{t("ui.assets.help.title")}</PopoverTitle>
        <HelpScreenshot
          src="/help/chart-comments.png"
          alt={t("ui.assets.help.imageAlt")}
          className="h-auto max-h-none rounded-none"
        />
        <PopoverDescription render={<div />}>
          <HelpSteps steps={t("ui.assets.help.instructions", { returnObjects: true })} />
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
