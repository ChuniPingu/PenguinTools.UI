import { CircleHelpIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DOCUMENTATION_URL } from "@/lib/cli-types";

export type MetadataHelpKind = "stage" | "fline" | "genre" | "wetag" | "main" | "date";

type HelpHintProps =
  | { kind: MetadataHelpKind; title?: never; description?: never }
  | { kind?: never; title: string; description: string };

export function HelpHint(props: HelpHintProps) {
  if (props.kind) return <MetadataHelpHint kind={props.kind} />;
  return <PropertyHelpHint title={props.title} description={props.description} />;
}

function PropertyHelpHint({ title, description }: { title: string; description: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t("ui.help.aboutAriaLabel", { title })}
        className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
      >
        <CircleHelpIcon className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))]">
        <PopoverTitle>{title}</PopoverTitle>
        <PopoverDescription className="text-xs leading-relaxed">{description}</PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}

function MetadataHelpHint({ kind }: { kind: MetadataHelpKind }) {
  const { t } = useTranslation();
  const command = t(`ui.help.metadata.commands.${kind}`);
  const example = t(`ui.help.metadata.examples.${kind}`);
  const hint =
    kind === "main"
      ? t("ui.help.metadata.hints.main")
      : kind === "date"
        ? t("ui.help.metadata.hints.date")
        : t("ui.help.metadata.twoValueHint");

  return (
    <Popover>
      <PopoverTrigger className="text-xs/relaxed font-medium text-primary underline underline-offset-2 hover:opacity-75 focus-visible:outline-none">
        {t("ui.help.metadata.trigger")}
      </PopoverTrigger>
      <PopoverContent className="w-[min(25rem,calc(100vw-2rem))]">
        <PopoverTitle className="pr-6">{t(`ui.help.metadata.titles.${kind}`)}</PopoverTitle>
        <PopoverDescription className="mt-2 space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p>{t("ui.help.metadata.instruction")}</p>
          <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-foreground">
            {command}
          </pre>
          <p>{hint}</p>
          <p className="font-mono text-foreground">{example}</p>
          <img
            src="/help/meta-command-zh.png"
            alt={t("ui.help.metadata.imageAlt")}
            className="w-full rounded-lg border"
          />
          <button
            type="button"
            className="font-medium text-foreground underline underline-offset-2"
            onClick={() => void openUrl(DOCUMENTATION_URL)}
          >
            {t("ui.help.metadata.openWiki")}
          </button>
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
