import { useTranslation } from "react-i18next";
import { FieldGroup } from "@/components/ui/field";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { ConvertWorkspace } from "@/components/convert/ConvertWorkspace";
import { useNativeFileDrop } from "@/hooks/use-native-file-drop";
import { useApp } from "@/contexts/AppContext";
import { afbExtractArgs } from "@/lib/cli-commands";
import { getExtension } from "@/lib/convert-files";
import { AFB_FILE_FILTERS, pickOutputFolder } from "@/lib/file-picker";
import { afbExtractOutputDir } from "@/lib/paths";
import { useToolPageStore } from "@/stores/tool-page-store";

export function StageExtractPage() {
  const { t } = useTranslation();
  const { runCliCommand, notifyError, notifyInfo } = useApp();
  const { afbPath } = useToolPageStore((state) => state.extractStage);
  const patchExtractStage = useToolPageStore((state) => state.patchExtractStage);

  const dropState = useNativeFileDrop((paths) => {
    const afb = paths.find((path) => getExtension(path) === "afb");
    if (afb) patchExtractStage({ afbPath: afb });
    else notifyInfo(t("ui.extract.stage.notify.invalidDrop"));
  });

  const handleExtract = async () => {
    if (!afbPath.trim()) {
      notifyError(t("ui.extract.stage.errors.missingAfb"));
      return;
    }
    const output = await pickOutputFolder(afbExtractOutputDir(afbPath));
    if (!output) return;
    void runCliCommand(afbExtractArgs(afbPath, output));
  };

  return (
    <ToolPageShell
      showReload={false}
      primaryLabel={t("ui.common.actions.extract")}
      primaryDisabled={!afbPath.trim()}
      onPrimary={() => void handleExtract()}
    >
      <ConvertWorkspace
        isDragging={dropState.isDragging}
        dropMessage={t("ui.extract.stage.dropMessage")}
      >
        <WorkspaceSection title={t("ui.common.sections.source")}>
          <FieldGroup>
            <FileFolderPicker
              label={t("ui.extract.stage.fields.afb")}
              value={afbPath}
              required
              filters={AFB_FILE_FILTERS}
              onChange={(path) => patchExtractStage({ afbPath: path })}
            />
          </FieldGroup>
        </WorkspaceSection>
      </ConvertWorkspace>
    </ToolPageShell>
  );
}
