import { useState } from "react";
import { CircleHelpIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HelpScreenshot } from "@/components/help/HelpScreenshot";
import { HelpSteps } from "@/components/help/HelpSteps";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assetPagePath, type AssetMetaKind } from "@/lib/asset-meta";

export type MetadataHelpKind =
  | "stage"
  | "fline"
  | "genre"
  | "wetag"
  | "main"
  | "date"
  | "songId"
  | "sortName"
  | "blankMeasure"
  | "initialTiming"
  | "mainTil";

type PropertyHelpKind =
  | "songId"
  | "sortName"
  | "blankMeasure"
  | "initialTiming"
  | "mainTil"
  | "stage"
  | "fline"
  | "genre"
  | "wetag";
type MetaHelpKind = "stage" | "fline" | "genre" | "wetag" | "main" | "date";
type HintHelpKind = "date" | "songId" | "sortName";
type HelpHintProps =
  | { kind: MetadataHelpKind; title?: never; description?: never }
  | { kind?: never; title: string; description: string };

const ASSET_HELP_KINDS: Partial<Record<MetadataHelpKind, AssetMetaKind>> = {
  stage: "stage",
  fline: "fieldLine",
  genre: "genre",
  wetag: "weTag",
};

const HELP_IMAGES: Record<MetadataHelpKind, { property?: string; meta?: string }> = {
  songId: { property: "/help/song-id.png" },
  sortName: { property: "/help/sort-name.png" },
  blankMeasure: { property: "/help/insert-blank-measure.png" },
  initialTiming: { property: "/help/first-beat-and-bpm.png" },
  mainTil: { property: "/help/main-til.png" },
  stage: {
    property: "/help/stage-from-property.png",
    meta: "/help/stage-from-directive.png",
  },
  fline: {
    property: "/help/fline-from-property.png",
    meta: "/help/fline-from-directive.png",
  },
  genre: {
    property: "/help/genre-from-property.png",
    meta: "/help/genre-from-directive.png",
  },
  wetag: {
    property: "/help/wetag-from-property.png",
    meta: "/help/wetag-from-directive.png",
  },
  main: { meta: "/help/main-from-directive.png" },
  date: { meta: "/help/date-from-directive.png" },
};

function isPropertyHelpKind(kind: MetadataHelpKind): kind is PropertyHelpKind {
  return (
    kind in
    {
      songId: true,
      sortName: true,
      blankMeasure: true,
      initialTiming: true,
      mainTil: true,
      stage: true,
      fline: true,
      genre: true,
      wetag: true,
    }
  );
}

function isMetaHelpKind(kind: MetadataHelpKind): kind is MetaHelpKind {
  return (
    kind in
    {
      stage: true,
      fline: true,
      genre: true,
      wetag: true,
      main: true,
      date: true,
    }
  );
}

function isHintHelpKind(kind: MetadataHelpKind): kind is HintHelpKind {
  return kind === "date" || kind === "songId" || kind === "sortName";
}

export function HelpHint(props: HelpHintProps) {
  if (props.kind) return <MetadataHelpHint kind={props.kind} />;
  return <PropertyHelpHint title={props.title} description={props.description} />;
}

function PropertyHelpHint({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("ui.help.aboutAriaLabel", { title })}
        className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        openOnHover
        delay={0}
        closeDelay={100}
      >
        <CircleHelpIcon className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))]">
        <PopoverTitle>{title}</PopoverTitle>
        <PopoverDescription className="text-xs/relaxed text-popover-foreground">
          {description}
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}

function PropertyHelpBody({
  propertyKind,
  hintKind,
  imageSrc,
}: Readonly<{
  propertyKind: PropertyHelpKind;
  hintKind: HintHelpKind | null;
  imageSrc: string;
}>) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <HelpSteps
        steps={t(`ui.help.metadata.propertyInstructions.${propertyKind}`, { returnObjects: true })}
      />
      {hintKind ? (
        <p className="text-xs/relaxed text-muted-foreground">
          {t(`ui.help.metadata.hints.${hintKind}`)}
        </p>
      ) : null}
      <HelpScreenshot src={imageSrc} alt={t("ui.help.metadata.imageAlts.property")} />
    </div>
  );
}

function MetaHelpBody({
  metaKind,
  hintKind,
  assetKind,
  imageSrc,
}: Readonly<{
  metaKind: MetaHelpKind;
  hintKind: HintHelpKind | null;
  assetKind: AssetMetaKind | undefined;
  imageSrc: string;
}>) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <HelpSteps steps={t("ui.help.metadata.metaInstructions", { returnObjects: true })} />
      <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-foreground">
        {t(`ui.help.metadata.commands.${metaKind}`)}
      </pre>
      {hintKind ? (
        <p className="text-xs/relaxed text-muted-foreground">
          {t(`ui.help.metadata.hints.${hintKind}`)}
        </p>
      ) : null}
      <HelpScreenshot src={imageSrc} alt={t("ui.help.metadata.imageAlts.meta")} />
      {assetKind ? (
        <p>
          <Link
            to={assetPagePath(assetKind)}
            className="font-medium text-primary underline underline-offset-2 hover:opacity-75"
          >
            {t("ui.help.metadata.findInAssets", {
              name: t(`ui.assets.tabs.${assetKind}`),
            })}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function MetadataHelpHint({ kind }: Readonly<{ kind: MetadataHelpKind }>) {
  const { t } = useTranslation();
  const images = HELP_IMAGES[kind];
  const propertyKind = isPropertyHelpKind(kind) ? kind : null;
  const metaKind = isMetaHelpKind(kind) ? kind : null;
  const showBoth = Boolean(propertyKind && metaKind && images.property && images.meta);
  const assetKind = ASSET_HELP_KINDS[kind];
  const hintKind = isHintHelpKind(kind) ? kind : null;
  const [method, setMethod] = useState<"property" | "meta">(kind === "stage" ? "meta" : "property");

  return (
    <Popover>
      <PopoverTrigger className="text-xs/relaxed font-medium text-primary underline underline-offset-2 hover:opacity-75 focus-visible:outline-none">
        {t("ui.help.metadata.trigger")}
      </PopoverTrigger>
      <PopoverContent className="flex w-[min(25rem,calc(100vw-2rem))] max-h-[min(28rem,var(--available-height))] flex-col gap-0 overflow-hidden p-0">
        <PopoverTitle className="shrink-0 px-2.5 pt-2.5 pr-8">
          {kind === "stage"
            ? t(`ui.help.metadata.titles.stage.${method}`)
            : t(`ui.help.metadata.titles.${kind}`)}
        </PopoverTitle>
        <ScrollArea className="min-h-0 flex-1 overflow-hidden">
          <PopoverDescription
            render={<div />}
            className="space-y-3 px-2.5 pt-2 pb-2.5 text-xs/relaxed text-popover-foreground"
          >
            {showBoth && propertyKind && metaKind && images.property && images.meta ? (
              <Tabs
                value={method}
                onValueChange={(value) => setMethod(value === "meta" ? "meta" : "property")}
                className="gap-2"
              >
                <TabsList variant="line" className="w-full">
                  <TabsTrigger value="property" className="flex-1">
                    {t("ui.help.metadata.propertySection")}
                  </TabsTrigger>
                  <TabsTrigger value="meta" className="flex-1">
                    {t("ui.help.metadata.metaSection")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="property" className="text-xs/relaxed">
                  <PropertyHelpBody
                    propertyKind={propertyKind}
                    hintKind={null}
                    imageSrc={images.property}
                  />
                </TabsContent>
                <TabsContent value="meta" className="text-xs/relaxed">
                  <MetaHelpBody
                    metaKind={metaKind}
                    hintKind={null}
                    assetKind={assetKind}
                    imageSrc={images.meta}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <>
                {propertyKind && images.property ? (
                  <PropertyHelpBody
                    propertyKind={propertyKind}
                    hintKind={hintKind}
                    imageSrc={images.property}
                  />
                ) : null}
                {metaKind && images.meta ? (
                  <MetaHelpBody
                    metaKind={metaKind}
                    hintKind={hintKind}
                    assetKind={assetKind}
                    imageSrc={images.meta}
                  />
                ) : null}
              </>
            )}
          </PopoverDescription>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
