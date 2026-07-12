import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { FieldGroup } from "@/components/ui/field";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { ToolPageShell } from "@/components/layout/ToolPageShell";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { PropertiesSection } from "@/components/layout/PropertiesSection";
import { PropertyGroup } from "@/components/layout/PropertyGroup";
import { PropertyRow } from "@/components/layout/PropertyRow";
import { ToggleField } from "@/components/layout/PropertyFields";
import { ConvertWorkspace } from "@/components/convert/ConvertWorkspace";
import { useNativeFileDrop } from "@/hooks/use-native-file-drop";
import { useApp } from "@/contexts/AppContext";
import { musicExtractArgs } from "@/lib/cli-commands";
import { getExtension } from "@/lib/convert-files";
import { getBaseName, musicExtractOutputDir } from "@/lib/paths";
import {
  CRI_AUDIO_FILTERS,
  JACKET_EXTRACT_FILTERS,
  MUSIC_XML_FILTERS,
  pickOutputFolder,
} from "@/lib/file-picker";
import { useToolPageStore } from "@/stores/tool-page-store";

function isMusicXmlPath(path: string): boolean {
  return getBaseName(path).toLowerCase() === "music.xml" || getExtension(path) === "xml";
}

export function MusicExtractPage() {
  const { t } = useTranslation();
  const { runCliCommand, notifyError, notifyInfo } = useApp();
  const { musicXmlPath, jacketPath, acbPath, awbPath, hcaKey, noAudio, noJacket } =
    useToolPageStore((state) => state.extractMusic);
  const patchExtractMusic = useToolPageStore((state) => state.patchExtractMusic);

  const dropState = useNativeFileDrop((paths) => {
    const musicXml = paths.find((path) => isMusicXmlPath(path));
    if (musicXml) patchExtractMusic({ musicXmlPath: musicXml });
    else notifyInfo(t("ui.extract.music.notify.invalidDrop"));
  });

  const handleExtract = async () => {
    if (!musicXmlPath.trim()) {
      notifyError(t("ui.extract.music.errors.missingMusicXml"));
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
    const output = await pickOutputFolder(musicExtractOutputDir(musicXmlPath));
    if (!output) return;
    void runCliCommand(
      musicExtractArgs(musicXmlPath, output, {
        jacketPath: jacketPath.trim() || undefined,
        acbPath: acbPath.trim() || undefined,
        awbPath: awbPath.trim() || undefined,
        hcaKey: hcaKey.trim() || undefined,
        noAudio,
        noJacket,
      }),
    );
  };

  return (
    <ToolPageShell
      showReload={false}
      primaryLabel={t("ui.common.actions.extract")}
      primaryDisabled={!musicXmlPath.trim()}
      onPrimary={() => void handleExtract()}
    >
      <ConvertWorkspace
        isDragging={dropState.isDragging}
        dropMessage={t("ui.extract.music.dropMessage")}
      >
        <WorkspaceSection title={t("ui.common.sections.source")}>
          <FieldGroup>
            <FileFolderPicker
              label={t("ui.extract.music.fields.musicXml")}
              value={musicXmlPath}
              required
              filters={MUSIC_XML_FILTERS}
              onChange={(path) => patchExtractMusic({ musicXmlPath: path })}
            />
          </FieldGroup>
        </WorkspaceSection>

        <PropertiesSection title={t("ui.common.sections.properties")}>
          <PropertyGroup title={t("ui.groups.overrides")} contentClassName="gap-2 py-3">
            <FileFolderPicker
              label={t("ui.extract.music.fields.jacket")}
              value={jacketPath}
              filters={JACKET_EXTRACT_FILTERS}
              onChange={(path) => patchExtractMusic({ jacketPath: path })}
            />
            <FileFolderPicker
              label={t("ui.extract.music.fields.acb")}
              value={acbPath}
              filters={CRI_AUDIO_FILTERS}
              onChange={(path) => patchExtractMusic({ acbPath: path })}
            />
            <FileFolderPicker
              label={t("ui.extract.music.fields.awb")}
              value={awbPath}
              filters={CRI_AUDIO_FILTERS}
              onChange={(path) => patchExtractMusic({ awbPath: path })}
            />
          </PropertyGroup>
          <PropertyGroup title={t("ui.groups.encoding")} contentClassName="gap-0 py-0">
            <PropertyRow
              label={t("ui.properties.hcaKey.label")}
              description={t("ui.properties.hcaKey.description")}
              htmlFor="extract-music-hca-key"
            >
              <Input
                id="extract-music-hca-key"
                className="max-w-xl"
                value={hcaKey}
                onChange={(event) => patchExtractMusic({ hcaKey: event.target.value })}
              />
            </PropertyRow>
            <PropertyRow
              label={t("ui.extract.music.fields.noAudio")}
              htmlFor="extract-music-no-audio"
            >
              <ToggleField
                id="extract-music-no-audio"
                label={t("ui.extract.music.fields.noAudio")}
                checked={noAudio}
                compact
                onChange={(checked) => patchExtractMusic({ noAudio: checked })}
              />
            </PropertyRow>
            <PropertyRow
              label={t("ui.extract.music.fields.noJacket")}
              htmlFor="extract-music-no-jacket"
            >
              <ToggleField
                id="extract-music-no-jacket"
                label={t("ui.extract.music.fields.noJacket")}
                checked={noJacket}
                compact
                onChange={(checked) => patchExtractMusic({ noJacket: checked })}
              />
            </PropertyRow>
          </PropertyGroup>
        </PropertiesSection>
      </ConvertWorkspace>
    </ToolPageShell>
  );
}
