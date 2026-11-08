import { useTranslation } from "react-i18next";
import { DecimalInput, IntegerInput } from "@/components/ui/numeric-input";
import { Field, FieldLabel } from "@/components/ui/field";
import { ComputedValue } from "@/components/layout/ComputedField";
import { HcaKeyField } from "@/components/layout/HcaKeyField";
import { PropertiesSection } from "@/components/layout/PropertiesSection";
import { PropertyGroup } from "@/components/layout/PropertyGroup";
import { PropertyRow } from "@/components/layout/PropertyRow";
import { TimeSignatureInput } from "@/components/layout/TimeSignatureInput";
import { ToggleField } from "@/components/layout/PropertyFields";
import { calculateAudioTiming, formatOffset } from "@/lib/convert-files";
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
          <IntegerInput
            id="audio-song-id"
            className="max-w-md"
            value={songId}
            onChange={(event) => patchAudio({ songId: event.target.value })}
          />
        </PropertyRow>
      </PropertyGroup>
      <PropertyGroup title={t("ui.groups.bgm")} contentClassName="gap-0 py-0">
        <PropertyRow label={t("ui.properties.previewStart.label")} htmlFor="audio-preview-start">
          <DecimalInput
            id="audio-preview-start"
            className="max-w-md"
            value={previewStart}
            onChange={(event) => patchAudio({ previewStart: event.target.value })}
          />
        </PropertyRow>
        <PropertyRow label={t("ui.properties.previewStop.label")} htmlFor="audio-preview-stop">
          <DecimalInput
            id="audio-preview-stop"
            className="max-w-md"
            value={previewStop}
            onChange={(event) => patchAudio({ previewStop: event.target.value })}
          />
        </PropertyRow>
      </PropertyGroup>

      <PropertyGroup title={t("ui.groups.sync")} contentClassName="gap-0 py-0">
        <PropertyRow
          label={t("ui.properties.realOffset.label")}
          description={t("ui.properties.realOffset.description")}
          htmlFor="audio-real-offset"
        >
          <ComputedValue
            id="audio-real-offset"
            className="max-w-md"
            value={formatOffset(timing.realOffset)}
          />
        </PropertyRow>
        <PropertyRow label={t("ui.properties.manualOffset.label")} htmlFor="audio-manual-offset">
          <DecimalInput
            id="audio-manual-offset"
            className="max-w-md font-mono tabular-nums"
            value={manualOffset}
            onChange={(event) => patchAudio({ manualOffset: event.target.value })}
            onBlur={() => {
              const parsed = Number(manualOffset);
              if (!Number.isNaN(parsed)) {
                patchAudio({ manualOffset: formatOffset(parsed) ?? "0.000000" });
              }
            }}
          />
        </PropertyRow>
        <PropertyRow
          label={t("ui.properties.barOffset.label")}
          description={t("ui.properties.barOffset.description")}
          htmlFor="audio-bar-offset"
        >
          <ComputedValue
            id="audio-bar-offset"
            className="max-w-md"
            value={formatOffset(timing.barOffset)}
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
                <DecimalInput
                  id="audio-initial-bpm"
                  className="max-w-md"
                  value={initialBpm}
                  onChange={(event) => patchAudio({ initialBpm: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel id="audio-initial-time-signature-label">
                  {t("ui.properties.timeSignature.label")}
                </FieldLabel>
                <TimeSignatureInput
                  id="audio-initial-time-signature"
                  labelId="audio-initial-time-signature-label"
                  numerator={initialNumerator}
                  denominator={initialDenominator}
                  onChange={(values) =>
                    patchAudio({
                      initialNumerator: values.numerator,
                      initialDenominator: values.denominator,
                    })
                  }
                />
              </Field>
            </div>
          ) : null}
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
