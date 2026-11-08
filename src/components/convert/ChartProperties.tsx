import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";
import { MetadataOnlyInspection } from "@/components/convert/MetadataOnlyInspection";
import { DecimalInput, IntegerInput } from "@/components/ui/numeric-input";
import { PropertiesSection } from "@/components/layout/PropertiesSection";
import { PropertyGroup } from "@/components/layout/PropertyGroup";
import { PropertyRow } from "@/components/layout/PropertyRow";
import { ToggleField } from "@/components/layout/PropertyFields";
import { DifficultyCombobox } from "@/components/convert/DifficultyCombobox";
import { HelpHint } from "@/components/convert/HelpHint";
import { useTranslation } from "react-i18next";
import { CHART_DIFFICULTY_OPTIONS } from "@/lib/chart-difficulty";
import { useToolPageStore } from "@/stores/tool-page-store";

export function ChartProperties({
  page,
  children,
}: Readonly<{ page: "chart" | "extractChart"; children?: ReactNode }>) {
  const { t } = useTranslation();
  const { data, songId, designer, difficultyId, mainBpm, insertBlankMeasure } = useToolPageStore(
    (state) => state[page],
  );
  const patch = useToolPageStore((state) =>
    page === "chart" ? state.patchChart : state.patchExtractChart,
  );
  const prefix = page === "chart" ? "chart" : "extract-chart";
  if (data && (!data.metadata || data.notesParsed === false))
    return <MetadataOnlyInspection data={data} />;
  return (
    <PropertiesSection title={t("ui.common.sections.properties")}>
      <PropertyGroup title={t("ui.groups.song")} contentClassName="gap-0 py-0">
        <PropertyRow
          label={t("ui.properties.songId.label")}
          description={t("ui.properties.songId.description")}
          labelAction={<HelpHint kind="songId" />}
          htmlFor={`${prefix}-song-id`}
        >
          <IntegerInput
            id={`${prefix}-song-id`}
            className="max-w-md"
            value={songId}
            onChange={(event) => patch({ songId: event.target.value })}
          />
        </PropertyRow>
      </PropertyGroup>
      <PropertyGroup title={t("ui.groups.chart")} contentClassName="gap-0 py-0">
        {children}
        <PropertyRow label={t("ui.chart.fields.designer")} htmlFor={`${prefix}-designer`}>
          <Input
            id={`${prefix}-designer`}
            className="max-w-xl"
            value={designer}
            onChange={(event) => patch({ designer: event.target.value })}
          />
        </PropertyRow>
        <PropertyRow label={t("ui.chart.fields.difficulty")} htmlFor={`${prefix}-difficulty`}>
          <DifficultyCombobox
            id={`${prefix}-difficulty`}
            className="max-w-xl"
            items={CHART_DIFFICULTY_OPTIONS}
            value={difficultyId}
            onValueChange={(id) => patch({ difficultyId: id })}
          />
        </PropertyRow>
        <PropertyRow label={t("ui.properties.displayBpm.label")} htmlFor={`${prefix}-display-bpm`}>
          <DecimalInput
            id={`${prefix}-display-bpm`}
            className="max-w-md"
            value={mainBpm}
            onChange={(event) => patch({ mainBpm: event.target.value })}
          />
        </PropertyRow>
      </PropertyGroup>
      <PropertyGroup title={t("ui.groups.sync")} contentClassName="gap-0 py-0">
        <PropertyRow
          label={t("ui.properties.blankMeasure.label")}
          description={t("ui.properties.blankMeasure.description")}
          labelAction={<HelpHint kind="blankMeasure" />}
          htmlFor={`${prefix}-insert-blank-measure`}
        >
          <ToggleField
            id={`${prefix}-insert-blank-measure`}
            label={t("ui.properties.blankMeasure.label")}
            checked={insertBlankMeasure}
            compact
            onChange={(checked) => patch({ insertBlankMeasure: checked })}
          />
        </PropertyRow>
      </PropertyGroup>
    </PropertiesSection>
  );
}
