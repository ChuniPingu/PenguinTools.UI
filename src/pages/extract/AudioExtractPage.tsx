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
import { CRI_AUDIO_FILTERS, pickOutputFolder } from "@/lib/file-picker";
import { audioExtractOutputDir } from "@/lib/paths";
import { useToolPageStore } from "@/stores/tool-page-store";

function isCriAudioPath(path: string): boolean {
  const extension = getExtension(path);
  return extension === "acb" || extension === "awb";
}

export function AudioExtractPage() {
  const { t } = useTranslation();
  const { runCliCommand, notifyError, notifyInfo } = useApp();
  const { audioPath, pairedPath, hcaKey } = useToolPageStore((state) => state.extractAudio);
  const patchExtractAudio = useToolPageStore((state) => state.patchExtractAudio);

  const dropState = useNativeFileDrop((paths) => {
    const audio = paths.find((path) => isCriAudioPath(path));
    if (audio) patchExtractAudio({ audioPath: audio });
    else notifyInfo(t("ui.extract.audio.notify.invalidDrop"));
  });

  const handleExtract = async () => {
    if (!audioPath.trim()) {
      notifyError(t("ui.extract.audio.errors.missingAudio"));
      return;
    }
    if (hcaKey.trim()) {
      try {
        const parsedKey = BigInt(hcaKey);
        if (parsedKey < 0n || parsedKey > 18446744073709551615n) throw new Error();
      } catch {
        notifyError(t("ui.errors.invalidHcaKey"));
        return;
      }
    }
    const output = await pickOutputFolder(audioExtractOutputDir(audioPath));
    if (!output) return;
    void runCliCommand(
      audioExtractArgs(audioPath, output, {
        pairedInput: pairedPath.trim() || undefined,
        hcaKey: hcaKey.trim() || undefined,
      }),
    );
  };

  return (
    <ToolPageShell
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
              label={t("ui.extract.audio.fields.criAudio")}
              value={audioPath}
              required
              filters={CRI_AUDIO_FILTERS}
              onChange={(path) => patchExtractAudio({ audioPath: path })}
            />
          </FieldGroup>
        </WorkspaceSection>

        <PropertiesSection title={t("ui.common.sections.properties")}>
          <PropertyGroup title={t("ui.groups.overrides")} contentClassName="gap-2 py-3">
            <FileFolderPicker
              label={t("ui.extract.audio.fields.pairedInput")}
              value={pairedPath}
              filters={CRI_AUDIO_FILTERS}
              onChange={(path) => patchExtractAudio({ pairedPath: path })}
            />
          </PropertyGroup>
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
