import { RefreshCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChartFormatOrderField } from "@/components/export/ChartFormatOrderField";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { HcaKeyField } from "@/components/layout/HcaKeyField";
import { PropertiesSection } from "@/components/layout/PropertiesSection";
import { PropertyGroup } from "@/components/layout/PropertyGroup";
import { PropertyRow } from "@/components/layout/PropertyRow";
import { ToggleField } from "@/components/layout/PropertyFields";
import type { ExportSettings } from "@/stores/tool-page-store";
import { useToolPageStore } from "@/stores/tool-page-store";

export function OptionSettings({
  chartFormatsDirty,
  reloadDisabled,
  onChartFormatsChange,
  onSaveAndReload,
}: {
  chartFormatsDirty: boolean;
  reloadDisabled: boolean;
  onChartFormatsChange: (value: string) => void;
  onSaveAndReload: () => void;
}) {
  const { t } = useTranslation();
  const {
    optionName,
    chartFileDiscovery,
    batchSize,
    hcaKey,
    ignoreCache,
    releaseTagId,
    releaseTagTitleName,
    ultimaEventId,
    weEventId,
    exportSettings,
  } = useToolPageStore((state) => state.option);
  const patchOption = useToolPageStore((state) => state.patchOption);

  const updateExportSetting = (key: keyof ExportSettings, checked: boolean) => {
    patchOption({ exportSettings: { ...exportSettings, [key]: checked } });
  };

  return (
    <PropertiesSection title={t("ui.option.settings")} contentClassName="p-0">
      <PropertyGroup title={t("ui.groups.jobSetup")} contentClassName="gap-0 py-0">
        <PropertyRow
          label={t("ui.option.optionName")}
          description={t("ui.option.fieldDescriptions.optionName")}
          htmlFor="option-name"
        >
          <Input
            id="option-name"
            className="w-32 uppercase"
            value={optionName}
            maxLength={4}
            onChange={(event) => patchOption({ optionName: event.target.value.toUpperCase() })}
          />
        </PropertyRow>
        <PropertyRow
          label={t("ui.properties.chartDiscovery.label")}
          description={t("ui.properties.chartDiscovery.description")}
        >
          <ChartFormatOrderField
            value={chartFileDiscovery}
            disabled={reloadDisabled}
            onChange={onChartFormatsChange}
          />
          {chartFormatsDirty ? (
            <div
              role="status"
              className="mt-2 flex max-w-2xl flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/25 px-2.5 py-2"
            >
              <p className="text-xs leading-4 text-muted-foreground">
                {t("ui.option.chartFormats.reloadPrompt")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={reloadDisabled}
                onClick={onSaveAndReload}
              >
                <RefreshCwIcon />
                {t("ui.option.chartFormats.saveAndReload")}
              </Button>
            </div>
          ) : null}
        </PropertyRow>
        <PropertyRow
          label={t("ui.option.batchSize")}
          description={t("ui.option.fieldDescriptions.batchSize")}
          htmlFor="batch-size"
        >
          <Input
            id="batch-size"
            className="w-28"
            value={batchSize}
            inputMode="numeric"
            onChange={(event) => patchOption({ batchSize: event.target.value })}
          />
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup title={t("ui.groups.outputs")} contentClassName="gap-0 py-0">
        <PropertyRow
          label={t("ui.option.outputTypes")}
          description={t("ui.option.fieldDescriptions.outputTypes")}
        >
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
      </PropertyGroup>

      <PropertyGroup title={t("ui.groups.generatedFiles")} contentClassName="gap-0 py-0">
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
                <Input
                  id="ultima-event-id"
                  value={ultimaEventId}
                  inputMode="numeric"
                  onChange={(event) => patchOption({ ultimaEventId: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="we-event-id">{t("ui.option.weEventId")}</FieldLabel>
                <Input
                  id="we-event-id"
                  value={weEventId}
                  inputMode="numeric"
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
            id="generate-release-tag-xml"
            label={t("ui.option.generateReleaseTagXml")}
            checked={exportSettings.generateReleaseTagXml}
            onChange={(checked) => updateExportSetting("generateReleaseTagXml", checked)}
          />
          {exportSettings.generateReleaseTagXml ? (
            <div className="mt-3 grid max-w-xl gap-4 border-l-2 border-primary/30 pl-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <Field>
                <FieldLabel htmlFor="release-tag-id">{t("ui.option.releaseTagId")}</FieldLabel>
                <Input
                  id="release-tag-id"
                  value={releaseTagId}
                  inputMode="numeric"
                  onChange={(event) => patchOption({ releaseTagId: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="release-tag-title">
                  {t("ui.option.releaseTagTitle")}
                </FieldLabel>
                <Input
                  id="release-tag-title"
                  value={releaseTagTitleName}
                  onChange={(event) => patchOption({ releaseTagTitleName: event.target.value })}
                />
              </Field>
            </div>
          ) : null}
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup title={t("ui.groups.advanced")} contentClassName="gap-0 py-0">
        <HcaKeyField
          id="option-hca-key"
          value={hcaKey}
          onChange={(value) => patchOption({ hcaKey: value })}
        />
        <PropertyRow
          label={t("ui.option.ignoreCache")}
          description={t("ui.option.fieldDescriptions.ignoreCache")}
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
