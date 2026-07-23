import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ComputedField, ComputedValue } from "@/components/layout/ComputedField";
import { HcaKeyField } from "@/components/layout/HcaKeyField";
import { PropertiesSection } from "@/components/layout/PropertiesSection";
import { PropertyGroup } from "@/components/layout/PropertyGroup";
import { PropertyRow } from "@/components/layout/PropertyRow";
import { ToggleField } from "@/components/layout/PropertyFields";
import { calculateAudioTiming } from "@/lib/convert-files";
import { useToolPageStore } from "@/stores/tool-page-store";

export function AudioProperties() {
  const { t } = useTranslation();
  const {
    songId,
    previewStart,
    previewStop,
    manualOffset,
    insertBlankMeasure,
    initialBpm,
    initialNumerator,
    initialDenominator,
    hcaKey,
  } = useToolPageStore((state) => state.audio);
  const patchAudio = useToolPageStore((state) => state.patchAudio);
  const timing = calculateAudioTiming({
    manualOffset: Number(manualOffset) || 0,
    insertBlankMeasure,
    initialBpm: Number(initialBpm),
    initialNumerator: Number(initialNumerator),
    initialDenominator: Number(initialDenominator),
  });

  return (
    <PropertiesSection title={t("ui.common.sections.properties")}>
      <PropertyGroup title={t("ui.groups.song")} contentClassName="gap-0 py-0">
        <PropertyRow
          label={t("ui.properties.songId.label")}
          description={t("ui.properties.songId.description")}
          htmlFor="audio-song-id"
        >
          <Input
            id="audio-song-id"
            className="max-w-md"
            value={songId}
            inputMode="numeric"
            onChange={(event) => patchAudio({ songId: event.target.value })}
          />
        </PropertyRow>
      </PropertyGroup>
      <PropertyGroup title={t("ui.groups.bgm")} contentClassName="gap-0 py-0">
        <PropertyRow
          label={t("ui.properties.previewStart.label")}
          description={t("ui.properties.previewStart.description")}
          htmlFor="audio-preview-start"
        >
          <Input
            id="audio-preview-start"
            className="max-w-md"
            value={previewStart}
            inputMode="decimal"
            onChange={(event) => patchAudio({ previewStart: event.target.value })}
          />
        </PropertyRow>
        <PropertyRow
          label={t("ui.properties.previewStop.label")}
          description={t("ui.properties.previewStop.description")}
          htmlFor="audio-preview-stop"
        >
          <Input
            id="audio-preview-stop"
            className="max-w-md"
            value={previewStop}
            inputMode="decimal"
            onChange={(event) => patchAudio({ previewStop: event.target.value })}
          />
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup title={t("ui.groups.sync")} contentClassName="gap-0 py-0">
        <PropertyRow
          label={t("ui.properties.manualOffset.label")}
          description={t("ui.properties.manualOffset.description")}
          htmlFor="audio-manual-offset"
        >
          <Input
            id="audio-manual-offset"
            className="max-w-md"
            value={manualOffset}
            inputMode="decimal"
            onChange={(event) => patchAudio({ manualOffset: event.target.value })}
          />
        </PropertyRow>
        <PropertyRow
          label={t("ui.properties.blankMeasure.label")}
          description={t("ui.properties.blankMeasure.description")}
          htmlFor="audio-insert-blank-measure"
        >
          <ToggleField
            id="audio-insert-blank-measure"
            label={t("ui.properties.blankMeasure.label")}
            checked={insertBlankMeasure}
            compact
            onChange={(checked) => patchAudio({ insertBlankMeasure: checked })}
          />
          {insertBlankMeasure ? (
            <div className="mt-3 flex max-w-xl flex-col gap-4 border-l-2 border-primary/30 pl-4">
              <Field>
                <FieldLabel htmlFor="audio-initial-bpm">
                  {t("ui.properties.initialBpm.label")}
                </FieldLabel>
                <Input
                  id="audio-initial-bpm"
                  className="max-w-md"
                  value={initialBpm}
                  inputMode="decimal"
                  onChange={(event) => patchAudio({ initialBpm: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel>{t("ui.properties.timeSignature.label")}</FieldLabel>
                <FieldGroup className="grid max-w-md grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="audio-initial-numerator">
                      {t("ui.properties.timeSignature.numerator")}
                    </FieldLabel>
                    <Input
                      id="audio-initial-numerator"
                      value={initialNumerator}
                      inputMode="decimal"
                      onChange={(event) => patchAudio({ initialNumerator: event.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="audio-initial-denominator">
                      {t("ui.properties.timeSignature.denominator")}
                    </FieldLabel>
                    <Input
                      id="audio-initial-denominator"
                      value={initialDenominator}
                      inputMode="decimal"
                      onChange={(event) => patchAudio({ initialDenominator: event.target.value })}
                    />
                  </Field>
                </FieldGroup>
              </Field>
              <ComputedField
                label={t("ui.audio.fields.oneMeasureOffset")}
                value={`${timing.barOffset.toFixed(6)} s`}
              />
            </div>
          ) : null}
        </PropertyRow>
        <PropertyRow
          label={t("ui.properties.realOffset.label")}
          description={t("ui.properties.realOffset.description")}
          htmlFor="audio-real-offset"
        >
          <ComputedValue
            id="audio-real-offset"
            className="max-w-md"
            value={`${timing.realOffset.toFixed(6)} s`}
          />
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup title={t("ui.groups.advanced")} contentClassName="gap-0 py-0">
        <HcaKeyField
          id="hca-key"
          value={hcaKey}
          onChange={(value) => patchAudio({ hcaKey: value })}
        />
      </PropertyGroup>
    </PropertiesSection>
  );
}
