import { RefreshCwIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChartFormatOrderField } from "@/components/export/ChartFormatOrderField";
import { GenreCombobox } from "@/components/export/GenreCombobox";
import { ReleaseTagCombobox } from "@/components/export/ReleaseTagCombobox";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IntegerInput, UppercaseAlphanumericInput } from "@/components/ui/numeric-input";
import { HcaKeyField } from "@/components/layout/HcaKeyField";
import { PropertiesSection } from "@/components/layout/PropertiesSection";
import { PropertyGroup } from "@/components/layout/PropertyGroup";
import { PropertyRow } from "@/components/layout/PropertyRow";
import { ToggleField } from "@/components/layout/PropertyFields";
import { useAssetCatalog } from "@/contexts/AssetCatalogContext";
import type { ExportSettings } from "@/stores/tool-page-store";
import { DEFAULT_GENRE, DEFAULT_RELEASE_TAG, useToolPageStore } from "@/stores/tool-page-store";

export function OptionSettings({
  chartFormatsDirty,
  reloadDisabled,
  onChartFormatsChange,
  onSaveAndReload,
}: Readonly<{
  chartFormatsDirty: boolean;
  reloadDisabled: boolean;
  onChartFormatsChange: (value: string) => void;
  onSaveAndReload: () => void;
}>) {
  const { t } = useTranslation();
  const { catalog } = useAssetCatalog();
  const {
    optionName,
    chartFileDiscovery,
    batchSize,
    hcaKey,
    ignoreCache,
    selectedReleaseTagId,
    customReleaseTagId,
    customReleaseTagTitleName,
    selectedGenreId,
    customGenreId,
    customGenreName,
    ultimaEventId,
    weEventId,
    exportSettings,
  } = useToolPageStore((state) => state.option);
  const patchOption = useToolPageStore((state) => state.patchOption);

  const updateExportSetting = (key: keyof ExportSettings, checked: boolean) => {
    patchOption({ exportSettings: { ...exportSettings, [key]: checked } });
  };

  const releaseTagItems = useMemo(() => {
    if (catalog.releaseTagNames.length > 0) return catalog.releaseTagNames;
    return [DEFAULT_RELEASE_TAG];
  }, [catalog.releaseTagNames]);

  const selectedReleaseTag = useMemo(() => {
    const id = Number(selectedReleaseTagId);
    const match = releaseTagItems.find((entry) => entry.id === id);
    if (match) return match;
    return {
      id: Number.isFinite(id) ? id : DEFAULT_RELEASE_TAG.id,
      name: DEFAULT_RELEASE_TAG.name,
      data: null,
    };
  }, [releaseTagItems, selectedReleaseTagId]);

  const genreItems = useMemo(() => {
    if (catalog.genreNames.length > 0) return catalog.genreNames;
    return [DEFAULT_GENRE];
  }, [catalog.genreNames]);

  const selectedGenre = useMemo(() => {
    const id = Number(selectedGenreId);
    const match = genreItems.find((entry) => entry.id === id);
    if (match) return match;
    return {
      id: Number.isFinite(id) ? id : DEFAULT_GENRE.id,
      name: DEFAULT_GENRE.name,
      data: null,
    };
  }, [genreItems, selectedGenreId]);

  return (
    <PropertiesSection title={t("ui.option.settings")} contentClassName="p-0">
      <PropertyGroup title={t("ui.groups.jobSetup")} contentClassName="gap-0 py-0">
        <PropertyRow
          label={t("ui.option.optionName")}
          description={t("ui.properties.optionName.description")}
          htmlFor="option-name"
        >
          <UppercaseAlphanumericInput
            id="option-name"
            className="w-32"
            value={optionName}
            maxLength={4}
            onChange={(event) => patchOption({ optionName: event.target.value })}
          />
        </PropertyRow>
        <PropertyRow
          label={t("ui.properties.chartDiscovery.label")}
          description={t("ui.properties.chartDiscovery.description")}
        >
          <div className="flex flex-col gap-2">
            <ChartFormatOrderField
              value={chartFileDiscovery}
              disabled={reloadDisabled}
              onChange={onChartFormatsChange}
            />
            {chartFormatsDirty ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-fit shrink-0"
                disabled={reloadDisabled}
                onClick={onSaveAndReload}
              >
                <RefreshCwIcon />
                {t("ui.option.chartFormats.saveAndReload")}
              </Button>
            ) : null}
          </div>
        </PropertyRow>
        <PropertyRow
          label={t("ui.option.batchSize")}
          description={t("ui.properties.batchSize.description")}
          htmlFor="batch-size"
        >
          <IntegerInput
            id="batch-size"
            className="w-28"
            value={batchSize}
            onChange={(event) => patchOption({ batchSize: event.target.value })}
          />
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup title={t("ui.groups.outputs")} contentClassName="gap-0 py-0">
        <PropertyRow label={t("ui.option.outputTypes")}>
          <div className="grid max-w-xl grid-cols-2 gap-x-4 gap-y-1 xl:grid-cols-4 [&_[data-slot=field]]:max-w-none">
            <ToggleField
              id="convert-chart"
              label={t("ui.option.convertCharts")}
              checked={exportSettings.convertChart}
              onChange={(checked) => updateExportSetting("convertChart", checked)}
            />
            <ToggleField
              id="convert-audio"
              label={t("ui.option.convertAudio")}
              checked={exportSettings.convertAudio}
              onChange={(checked) => updateExportSetting("convertAudio", checked)}
            />
            <ToggleField
              id="convert-jacket"
              label={t("ui.option.convertJackets")}
              checked={exportSettings.convertJacket}
              onChange={(checked) => updateExportSetting("convertJacket", checked)}
            />
            <ToggleField
              id="convert-background"
              label={t("ui.option.convertBackgrounds")}
              checked={exportSettings.convertBackground}
              onChange={(checked) => updateExportSetting("convertBackground", checked)}
            />
          </div>
        </PropertyRow>
        <PropertyRow
          label={t("ui.groups.eventXml")}
          description={t("ui.groupDescriptions.eventXml")}
          controlClassName="max-w-xl"
        >
          <ToggleField
            id="generate-event-xml"
            label={t("ui.option.generateEventXml")}
            checked={exportSettings.generateEventXml}
            onChange={(checked) => updateExportSetting("generateEventXml", checked)}
          />
          {exportSettings.generateEventXml ? (
            <div className="mt-3 grid max-w-xl gap-4 border-l-2 border-primary/30 pl-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ultima-event-id">{t("ui.option.ultimaEventId")}</FieldLabel>
                <IntegerInput
                  id="ultima-event-id"
                  value={ultimaEventId}
                  onChange={(event) => patchOption({ ultimaEventId: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="we-event-id">{t("ui.option.weEventId")}</FieldLabel>
                <IntegerInput
                  id="we-event-id"
                  value={weEventId}
                  onChange={(event) => patchOption({ weEventId: event.target.value })}
                />
              </Field>
            </div>
          ) : null}
        </PropertyRow>
        <PropertyRow
          label={t("ui.groups.releaseTagXml")}
          description={t("ui.groupDescriptions.releaseTagXml")}
          controlClassName="max-w-xl"
        >
          <ToggleField
            id="custom-release-tag-xml"
            label={t("ui.option.customReleaseTagXml")}
            checked={exportSettings.customReleaseTagXml}
            onChange={(checked) => updateExportSetting("customReleaseTagXml", checked)}
          />
          {exportSettings.customReleaseTagXml ? (
            <div className="mt-3 grid max-w-xl gap-4 border-l-2 border-primary/30 pl-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <Field>
                <FieldLabel htmlFor="custom-release-tag-id">
                  {t("ui.option.releaseTagId")}
                </FieldLabel>
                <IntegerInput
                  id="custom-release-tag-id"
                  value={customReleaseTagId}
                  onChange={(event) => patchOption({ customReleaseTagId: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="custom-release-tag-title">
                  {t("ui.option.releaseTagTitle")}
                </FieldLabel>
                <Input
                  id="custom-release-tag-title"
                  value={customReleaseTagTitleName}
                  onChange={(event) =>
                    patchOption({ customReleaseTagTitleName: event.target.value })
                  }
                />
              </Field>
            </div>
          ) : (
            <div className="mt-3 border-l-2 border-primary/30 pl-4">
              <Field>
                <FieldLabel htmlFor="release-tag">{t("ui.option.releaseTagVersion")}</FieldLabel>
                <ReleaseTagCombobox
                  id="release-tag"
                  items={releaseTagItems}
                  value={selectedReleaseTag}
                  onValueChange={(entry) =>
                    patchOption({
                      selectedReleaseTagId: String(entry.id),
                    })
                  }
                />
              </Field>
            </div>
          )}
        </PropertyRow>
        <PropertyRow
          label={t("ui.groups.genre")}
          description={t("ui.groupDescriptions.genre")}
          controlClassName="max-w-xl"
        >
          <ToggleField
            id="custom-genre"
            label={t("ui.option.customGenre")}
            checked={exportSettings.customGenre}
            onChange={(checked) => updateExportSetting("customGenre", checked)}
          />
          {exportSettings.customGenre ? (
            <div className="mt-3 grid max-w-xl gap-4 border-l-2 border-primary/30 pl-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <Field>
                <FieldLabel htmlFor="custom-genre-id">{t("ui.option.genreId")}</FieldLabel>
                <IntegerInput
                  id="custom-genre-id"
                  value={customGenreId}
                  onChange={(event) => patchOption({ customGenreId: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="custom-genre-name">{t("ui.option.genreName")}</FieldLabel>
                <Input
                  id="custom-genre-name"
                  value={customGenreName}
                  onChange={(event) => patchOption({ customGenreName: event.target.value })}
                />
              </Field>
            </div>
          ) : (
            <div className="mt-3 border-l-2 border-primary/30 pl-4">
              <Field>
                <FieldLabel htmlFor="genre">{t("ui.option.genre")}</FieldLabel>
                <GenreCombobox
                  id="genre"
                  items={genreItems}
                  value={selectedGenre}
                  onValueChange={(entry) =>
                    patchOption({
                      selectedGenreId: String(entry.id),
                    })
                  }
                />
              </Field>
            </div>
          )}
          <div className="mt-3">
            <ToggleField
              id="override-chart-genre"
              label={t("ui.option.overrideChartGenre")}
              checked={exportSettings.overrideChartGenre}
              onChange={(checked) => updateExportSetting("overrideChartGenre", checked)}
            />
          </div>
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup title={t("ui.groups.advanced")} contentClassName="gap-0 py-0">
        <HcaKeyField
          id="option-hca-key"
          value={hcaKey}
          onChange={(value) => patchOption({ hcaKey: value })}
        />
        <PropertyRow
          label={t("ui.option.ignoreCacheField")}
          description={t("ui.properties.ignoreCache.description")}
        >
          <ToggleField
            id="option-ignore-cache"
            label={t("ui.option.ignoreCache")}
            checked={ignoreCache}
            onChange={(checked) => patchOption({ ignoreCache: checked })}
          />
        </PropertyRow>
      </PropertyGroup>
    </PropertiesSection>
  );
}
