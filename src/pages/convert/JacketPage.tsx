import { useTranslation } from "react-i18next";
import { IntegerInput } from "@/components/ui/numeric-input";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { ComputedValue } from "@/components/layout/ComputedField";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { PropertyGroup } from "@/components/layout/PropertyGroup";
import { PropertyRow } from "@/components/layout/PropertyRow";
import { PropertiesSection } from "@/components/layout/PropertiesSection";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { ConvertWorkspace } from "@/components/convert/ConvertWorkspace";
import { useNativeFileDrop } from "@/hooks/use-native-file-drop";
import { useApp } from "@/contexts/AppContext";
import { jacketFileConvertArgs } from "@/lib/cli-commands";
import { usePageTask } from "@/hooks/use-page-task";
import { classifyConvertFile, jacketOutputName, suggestedPath } from "@/lib/convert-files";
import { IMAGE_SOURCE_FILTERS, pickSavePath } from "@/lib/file-picker";
import { canConvertInspectedChart, parseChartInspectData } from "@/lib/cli-results";
import { useToolPageStore } from "@/stores/tool-page-store";

export function JacketPage() {
  const { t } = useTranslation();
  const { notifyError, notifyInfo } = useApp();
  const query = usePageTask("jacket");
  const { chartPath, imagePath, jacketId } = useToolPageStore((state) => state.jacket);
  const patchJacket = useToolPageStore((state) => state.patchJacket);
  const sourceError = useToolPageStore((state) => state.jacket.sourceError);
  const setSourceError = (sourceError: string) => patchJacket({ sourceError });

  const selectImage = (path: string, preserveQuery = false) => {
    if (!preserveQuery) query.reset();
    patchJacket({ imagePath: path });
    setSourceError("");
  };
  const loadChart = (path: string, applyImage = true) => {
    patchJacket({ chartPath: path });
    setSourceError("");
    void query.run({ kind: "chartInspect", path }, (response) => {
      if (useToolPageStore.getState().jacket.chartPath.trim() !== path.trim()) return;
      const inspected = parseChartInspectData(response);
      if (!canConvertInspectedChart(inspected)) {
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
    if (image) selectImage(image, !!chart);
    if (!chart && !image) notifyInfo(t("ui.jacket.notify.invalidDrop"));
  });
  const handleConvert = async () => {
    if (!imagePath) {
      notifyError(t("ui.jacket.notify.missingImage"));
      return;
    }
    if (jacketId.trim() && !Number.isInteger(Number(jacketId))) {
      notifyError(t("ui.jacket.notify.invalidJacketId"));
      return;
    }
    const output = await pickSavePath({
      historyKey: "convert.jacket.output",
      title: t("ui.jacket.dialog.saveTitle"),
      defaultPath: suggestedPath(imagePath, jacketOutputName(imagePath, jacketId)),
      filters: [{ name: t("ui.jacket.dialog.filterName"), extensions: ["dds"] }],
    });
    if (output) void query.runCommand(jacketFileConvertArgs(imagePath, output));
  };
  const outputFileName = imagePath ? jacketOutputName(imagePath, jacketId) : null;

  return (
    <ToolPageShell
      task={query}
      primaryLabel={t("ui.common.actions.convert")}
      reloadDisabled={!chartPath}
      primaryDisabled={!imagePath}
      onReload={() => chartPath && loadChart(chartPath)}
      onPrimary={() => void handleConvert()}
    >
      <ConvertWorkspace isDragging={dropState.isDragging} dropMessage={t("ui.jacket.dropMessage")}>
        <WorkspaceSection title={t("ui.common.sections.source")}>
          <FieldGroup>
            <FileFolderPicker
              historyKey="convert.jacket.input"
              label={t("ui.jacket.fields.image")}
              value={imagePath}
              filters={IMAGE_SOURCE_FILTERS}
              onChange={handleSourceChange}
            />
            {sourceError ? <FieldError>{sourceError}</FieldError> : null}
          </FieldGroup>
        </WorkspaceSection>

        <PropertiesSection title={t("ui.common.sections.properties")}>
          <PropertyGroup title={t("ui.groups.output")} contentClassName="gap-0 py-0">
            <PropertyRow
              label={t("ui.properties.jacketId.label")}
              description={t("ui.properties.jacketId.description")}
              htmlFor="jacket-id"
            >
              <IntegerInput
                id="jacket-id"
                className="max-w-xl"
                value={jacketId}
                onChange={(event) => patchJacket({ jacketId: event.target.value })}
              />
            </PropertyRow>
            <PropertyRow label={t("ui.jacket.fields.fileName")} htmlFor="jacket-output-file">
              <ComputedValue id="jacket-output-file" className="max-w-xl" value={outputFileName} />
            </PropertyRow>
          </PropertyGroup>
        </PropertiesSection>
      </ConvertWorkspace>
    </ToolPageShell>
  );
}
