import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { PropertyGroup } from "@/components/layout/PropertyGroup";
import { PropertyRow } from "@/components/layout/PropertyRow";
import { PropertiesSection } from "@/components/layout/PropertiesSection";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { ConvertWorkspace } from "@/components/convert/ConvertWorkspace";
import { HelpHint } from "@/components/convert/HelpHint";
import { FieldLineCombobox } from "@/components/convert/FieldLineCombobox";
import { useNativeFileDrop } from "@/hooks/use-native-file-drop";
import { useApp } from "@/contexts/AppContext";
import { useAssetCatalog } from "@/contexts/AssetCatalogContext";
import { chartInspectArgs, stageFilesBuildArgs } from "@/lib/cli-commands";
import { classifyConvertFile } from "@/lib/convert-files";
import { IMAGE_FILE_FILTERS, IMAGE_SOURCE_FILTERS, pickOutputFolder } from "@/lib/file-picker";
import { getDirectory } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { parseChartInspectData } from "@/lib/cli-results";
import { DEFAULT_FIELD_LINE, useToolPageStore } from "@/stores/tool-page-store";

const STAGE_EFFECT_SLOT_IDS = [
  "stage-effect-0",
  "stage-effect-1",
  "stage-effect-2",
  "stage-effect-3",
] as const;

export function StagePage() {
  const { t } = useTranslation();
  const { runCliCommand, notifyError, notifyInfo } = useApp();
  const { catalog } = useAssetCatalog();
  const { chartPath, backgroundPath, stageId, fieldLine, effects } = useToolPageStore(
    (state) => state.stage,
  );
  const patchStage = useToolPageStore((state) => state.patchStage);
  const [sourceError, setSourceError] = useState("");

  const fieldLines = useMemo(
    () => (catalog.fieldLines.length ? catalog.fieldLines : [DEFAULT_FIELD_LINE]),
    [catalog.fieldLines],
  );

  useEffect(() => {
    if (!catalog.fieldLines.length) return;
    const match = catalog.fieldLines.find(
      (entry) => entry.id === fieldLine.id && entry.name === fieldLine.name,
    );
    if (match && match.data !== fieldLine.data) patchStage({ fieldLine: match });
  }, [catalog.fieldLines, fieldLine, patchStage]);

  const selectBackground = (path: string) => {
    patchStage({ backgroundPath: path });
    setSourceError("");
  };

  const loadChart = (path: string, applyBackground = true) => {
    patchStage({ chartPath: path });
    setSourceError("");
    void runCliCommand(chartInspectArgs(path), (response) => {
      const inspected = parseChartInspectData(response);
      if (!inspected) {
        setSourceError(t("ui.errors.chartUnread"));
        return;
      }
      const meta = inspected.metadata;
      const patch: Parameters<typeof patchStage>[0] = {
        fieldLine: meta.notesFieldLine,
      };
      if (meta.stageId != null) patch.stageId = String(meta.stageId);
      if (applyBackground) {
        if (meta.fullBgiFilePath) {
          patch.backgroundPath = meta.fullBgiFilePath;
          setSourceError("");
        } else {
          patch.backgroundPath = "";
          setSourceError(t("ui.stage.errors.noBackgroundInChart"));
        }
      }
      patchStage(patch);
    });
  };

  const assignDroppedImages = (images: string[]) => {
    let nextBackground = images[0] ?? backgroundPath;
    const nextEffects = [...effects];
    let cursor = images.length ? 1 : 0;
    for (; cursor < images.length; cursor += 1) {
      const slot = nextEffects.findIndex((path) => !path);
      if (slot < 0) break;
      nextEffects[slot] = images[cursor];
    }
    const patch: Parameters<typeof patchStage>[0] = { effects: nextEffects };
    if (nextBackground !== backgroundPath) {
      patch.backgroundPath = nextBackground;
      setSourceError("");
    }
    patchStage(patch);
    if (cursor < images.length) notifyInfo(t("ui.stage.notify.slotsFull"));
  };

  const handleBackgroundChange = (path: string) => {
    if (!path) {
      selectBackground(path);
      return;
    }
    if (classifyConvertFile(path) === "chart") loadChart(path);
    else selectBackground(path);
  };
  const dropState = useNativeFileDrop((paths, target) => {
    const chart = paths.find((path) => classifyConvertFile(path) === "chart");
    const images = paths.filter((path) => classifyConvertFile(path) === "image");
    if (chart) loadChart(chart, !images.length);
    const effectMatch = target?.match(/^stage-effect-(\d)$/);
    if (images.length && effectMatch) {
      const index = Number(effectMatch[1]);
      patchStage({
        effects: effects.map((value, slot) => (slot === index ? images[0] : value)),
      });
    } else if (images.length) assignDroppedImages(images);
    if (!chart && !images.length) notifyInfo(t("ui.stage.notify.invalidDrop"));
  });

  const allFieldLines = useMemo(() => {
    return fieldLines.some((entry) => entry.id === fieldLine.id && entry.name === fieldLine.name)
      ? fieldLines
      : [fieldLine, ...fieldLines];
  }, [fieldLine, fieldLines]);

  const handleConvert = async () => {
    const parsedStageId = Number(stageId);
    if (!backgroundPath || !Number.isInteger(parsedStageId)) {
      notifyError(t("ui.stage.errors.missingBackgroundOrStageId"));
      return;
    }
    const output = await pickOutputFolder(getDirectory(backgroundPath));
    if (!output) return;
    void runCliCommand(
      stageFilesBuildArgs(backgroundPath, output, {
        stageId: parsedStageId,
        effects,
        notesFieldLineId: fieldLine.id,
        notesFieldLineName: fieldLine.name,
        notesFieldLineData: fieldLine.data,
      }),
    );
  };

  return (
    <ToolPageShell
      showReload={Boolean(chartPath)}
      primaryLabel={t("ui.common.actions.convert")}
      primaryDisabled={!backgroundPath}
      onReload={() => chartPath && loadChart(chartPath)}
      onPrimary={() => void handleConvert()}
    >
      <ConvertWorkspace
        isDragging={dropState.isDragging && !dropState.activeTarget}
        dropMessage={t("ui.stage.dropMessage")}
      >
        <WorkspaceSection title={t("ui.common.sections.source")}>
          <FieldGroup className="gap-5">
            <FileFolderPicker
              label={t("ui.stage.fields.background")}
              value={backgroundPath}
              required
              filters={IMAGE_SOURCE_FILTERS}
              onChange={handleBackgroundChange}
            />
            {sourceError ? <FieldError>{sourceError}</FieldError> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {STAGE_EFFECT_SLOT_IDS.map((slotId, slot) => (
                <div
                  key={slotId}
                  data-native-drop-zone={slotId}
                  className={cn(
                    dropState.activeTarget === slotId && "rounded-lg ring-2 ring-primary/40",
                  )}
                >
                  <FileFolderPicker
                    label={t("ui.stage.fields.effect", { index: slot + 1 })}
                    value={effects[slot]}
                    filters={IMAGE_FILE_FILTERS}
                    onChange={(next) =>
                      patchStage({
                        effects: effects.map((value, effectSlot) =>
                          effectSlot === slot ? next : value,
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </FieldGroup>
        </WorkspaceSection>

        <PropertiesSection title={t("ui.common.sections.properties")}>
          <PropertyGroup title={t("ui.groups.output")} contentClassName="gap-0 py-0">
            <PropertyRow
              label={t("ui.properties.stageId.label")}
              description={t("ui.properties.stageId.description")}
              htmlFor="stage-id"
            >
              <Input
                id="stage-id"
                className="max-w-md"
                value={stageId}
                inputMode="numeric"
                onChange={(event) => patchStage({ stageId: event.target.value })}
              />
            </PropertyRow>
            <PropertyRow
              label={t("ui.properties.notesFieldLine.label")}
              description={t("ui.properties.notesFieldLine.description")}
              htmlFor="field-line"
              labelAction={<HelpHint kind="fline" />}
            >
              <div className="max-w-xl">
                <FieldLineCombobox
                  id="field-line"
                  items={allFieldLines}
                  value={fieldLine}
                  onValueChange={(nextFieldLine) => patchStage({ fieldLine: nextFieldLine })}
                />
              </div>
            </PropertyRow>
          </PropertyGroup>
        </PropertiesSection>
      </ConvertWorkspace>
    </ToolPageShell>
  );
}
