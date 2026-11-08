import { useTranslation } from "react-i18next";
import { FieldGroup } from "@/components/ui/field";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { HcaKeyField } from "@/components/layout/HcaKeyField";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { PropertiesSection } from "@/components/layout/PropertiesSection";
import { PropertyGroup } from "@/components/layout/PropertyGroup";
import { ConvertWorkspace } from "@/components/convert/ConvertWorkspace";
import { useNativeFileDrop } from "@/hooks/use-native-file-drop";
import { useApp } from "@/contexts/AppContext";
import { audioExtractArgs } from "@/lib/cli-commands";
import { getExtension } from "@/lib/convert-files";
import { AWB_FILE_FILTERS, pickOutputFolder } from "@/lib/file-picker";
import { audioExtractOutputDir } from "@/lib/paths";
import { useToolPageStore } from "@/stores/tool-page-store";

import { usePageTask } from "@/hooks/use-page-task";

export function AudioExtractPage() {
  const { t } = useTranslation();
  const task = usePageTask("extractAudio");
  const { notifyError, notifyInfo } = useApp();
  const { audioPath, hcaKey } = useToolPageStore((state) => state.extractAudio);
  const patchExtractAudio = useToolPageStore((state) => state.patchExtractAudio);

  const dropState = useNativeFileDrop((paths) => {
    const audio = paths.find((path) => getExtension(path) === "awb");
    if (audio) patchExtractAudio({ audioPath: audio });
    else notifyInfo(t("ui.extract.audio.notify.invalidDrop"));
  });

  const handleExtract = async () => {
    if (!audioPath.trim()) {
      notifyError(t("ui.extract.audio.notify.missingAudio"));
      return;
    }
    if (hcaKey.trim()) {
      try {
        const parsedKey = BigInt(hcaKey);
        if (parsedKey < 0n || parsedKey > 18446744073709551615n) {
          throw new RangeError(t("ui.common.notify.invalidHcaKey"));
        }
      } catch {
        notifyError(t("ui.common.notify.invalidHcaKey"));
        return;
      }
    }
    const output = await pickOutputFolder("extract.audio.output", audioExtractOutputDir(audioPath));
    if (!output) return;
    void task.runCommand(
      audioExtractArgs(audioPath, output, {
        hcaKey: hcaKey.trim() || undefined,
      }),
    );
  };

  return (
    <ToolPageShell
      task={task}
      showReload={false}
      primaryLabel={t("ui.common.actions.extract")}
      primaryDisabled={!audioPath.trim()}
      onPrimary={() => void handleExtract()}
    >
      <ConvertWorkspace
        isDragging={dropState.isDragging}
        dropMessage={t("ui.extract.audio.dropMessage")}
      >
        <WorkspaceSection title={t("ui.common.sections.source")}>
          <FieldGroup>
            <FileFolderPicker
              historyKey="extract.audio.input"
              label={t("ui.extract.audio.fields.awb")}
              value={audioPath}
              filters={AWB_FILE_FILTERS}
              onChange={(path) => patchExtractAudio({ audioPath: path })}
            />
          </FieldGroup>
        </WorkspaceSection>

        <PropertiesSection title={t("ui.common.sections.properties")}>
          <PropertyGroup title={t("ui.groups.encoding")} contentClassName="gap-0 py-0">
            <HcaKeyField
              id="extract-audio-hca-key"
              value={hcaKey}
              onChange={(value) => patchExtractAudio({ hcaKey: value })}
            />
          </PropertyGroup>
        </PropertiesSection>
      </ConvertWorkspace>
    </ToolPageShell>
  );
}
