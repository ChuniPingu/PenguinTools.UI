import { useState } from "react";
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
import { useNativeFileDrop } from "@/hooks/use-native-file-drop";
import { useApp } from "@/contexts/AppContext";
import { chartInspectArgs, jacketFileConvertArgs } from "@/lib/cli-commands";
import { classifyConvertFile, jacketOutputName, suggestedPath } from "@/lib/convert-files";
import { IMAGE_SOURCE_FILTERS, pickSavePath } from "@/lib/file-picker";
import { parseChartInspectData } from "@/lib/cli-results";
import { useToolPageStore } from "@/stores/tool-page-store";

export function JacketPage() {
  const { t } = useTranslation();
  const { runCliCommand, notifyError, notifyInfo } = useApp();
  const { chartPath, imagePath, jacketId } = useToolPageStore((state) => state.jacket);
  const patchJacket = useToolPageStore((state) => state.patchJacket);
  const [sourceError, setSourceError] = useState("");

  const selectImage = (path: string) => {
    patchJacket({ imagePath: path });
    setSourceError("");
  };
  const loadChart = (path: string, applyImage = true) => {
    patchJacket({ chartPath: path });
    setSourceError("");
    void runCliCommand(chartInspectArgs(path), (response) => {
      const inspected = parseChartInspectData(response);
      if (!inspected) {
        setSourceError(t("ui.errors.chartUnread"));
        return;
      }
      const patch: Parameters<typeof patchJacket>[0] = {};
      if (inspected.chart.songId != null) patch.jacketId = String(inspected.chart.songId);
      if (applyImage) {
        if (inspected.metadata.fullJacketFilePath) {
          patch.imagePath = inspected.metadata.fullJacketFilePath;
          setSourceError("");
        } else {
          patch.imagePath = "";
          setSourceError(t("ui.jacket.errors.noImageInChart"));
        }
      }
      patchJacket(patch);
    });
  };
  const handleSourceChange = (path: string) => {
    if (!path) {
      selectImage(path);
      return;
    }
    if (classifyConvertFile(path) === "chart") loadChart(path);
    else selectImage(path);
  };
  const dropState = useNativeFileDrop((paths) => {
    const chart = paths.find((path) => classifyConvertFile(path) === "chart");
    const image = paths.find((path) => classifyConvertFile(path) === "image");
    if (chart) loadChart(chart, !image);
    if (image) selectImage(image);
    if (!chart && !image) notifyInfo(t("ui.jacket.notify.invalidDrop"));
  });
  const handleConvert = async () => {
    if (!imagePath) {
      notifyError(t("ui.jacket.errors.missingImage"));
      return;
    }
    if (jacketId.trim() && !Number.isInteger(Number(jacketId))) {
      notifyError(t("ui.jacket.errors.invalidJacketId"));
      return;
    }
    const output = await pickSavePath({
      title: t("ui.jacket.dialog.saveTitle"),
      defaultPath: suggestedPath(imagePath, jacketOutputName(imagePath, jacketId)),
      filters: [{ name: t("ui.jacket.dialog.filterName"), extensions: ["dds"] }],
    });
    if (output) void runCliCommand(jacketFileConvertArgs(imagePath, output));
  };
  return (
    <ToolPageShell
      showReload={Boolean(chartPath)}
      primaryLabel={t("ui.common.actions.convert")}
      primaryDisabled={!imagePath}
      onReload={() => chartPath && loadChart(chartPath)}
      onPrimary={() => void handleConvert()}
    >
      <ConvertWorkspace isDragging={dropState.isDragging} dropMessage={t("ui.jacket.dropMessage")}>
        <WorkspaceSection title={t("ui.common.sections.source")}>
          <FieldGroup>
            <FileFolderPicker
              label={t("ui.jacket.fields.image")}
              value={imagePath}
              required
              filters={IMAGE_SOURCE_FILTERS}
              onChange={handleSourceChange}
            />
            {sourceError ? <FieldError>{sourceError}</FieldError> : null}
          </FieldGroup>
        </WorkspaceSection>

        <PropertiesSection title={t("ui.common.sections.properties")}>
          <PropertyGroup title={t("ui.groups.output")} contentClassName="gap-0 py-0">
            <PropertyRow label={t("ui.jacket.fields.jacketId")} htmlFor="jacket-id">
              <Input
                id="jacket-id"
                className="max-w-xl"
                value={jacketId}
                inputMode="numeric"
                onChange={(event) => patchJacket({ jacketId: event.target.value })}
              />
            </PropertyRow>
          </PropertyGroup>
        </PropertiesSection>
      </ConvertWorkspace>
    </ToolPageShell>
  );
}
