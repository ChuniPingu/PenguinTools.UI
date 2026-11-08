import { useTranslation } from "react-i18next";
import { EditorChartFormatField } from "@/components/convert/EditorChartFormatField";
import { FieldGroup } from "@/components/ui/field";
import { FileFolderPicker } from "@/components/layout/FileFolderPicker";
import { HcaKeyField } from "@/components/layout/HcaKeyField";
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
import { MUSIC_XML_FILTERS, pickOutputFolder } from "@/lib/file-picker";
import { useToolPageStore } from "@/stores/tool-page-store";

function isMusicXmlPath(path: string): boolean {
  return getBaseName(path).toLowerCase() === "music.xml" || getExtension(path) === "xml";
}

import { usePageTask } from "@/hooks/use-page-task";

export function MusicExtractPage() {
  const { t } = useTranslation();
  const task = usePageTask("extractMusic");
  const { notifyError, notifyInfo } = useApp();
  const { musicXmlPath, hcaKey, noAudio, noJacket, chartFormat } = useToolPageStore(
    (state) => state.extractMusic,
  );
  const patchExtractMusic = useToolPageStore((state) => state.patchExtractMusic);

  const dropState = useNativeFileDrop((paths) => {
    const musicXml = paths.find((path) => isMusicXmlPath(path));
    if (musicXml) patchExtractMusic({ musicXmlPath: musicXml });
    else notifyInfo(t("ui.extract.music.notify.invalidDrop"));
  });

  const handleExtract = async () => {
    if (!musicXmlPath.trim()) {
      notifyError(t("ui.extract.music.notify.missingMusicXml"));
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
    const output = await pickOutputFolder(
      "extract.music.output",
      musicExtractOutputDir(musicXmlPath, chartFormat),
    );
    if (!output) return;
    void task.runCommand(
      musicExtractArgs(musicXmlPath, output, {
        chartFormat,
        hcaKey: hcaKey.trim() || undefined,
        noAudio,
        noJacket,
      }),
    );
  };

  return (
    <ToolPageShell
      task={task}
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
              historyKey="extract.music.input"
              label={t("ui.extract.music.fields.musicXml")}
              value={musicXmlPath}
              filters={MUSIC_XML_FILTERS}
              onChange={(path) => patchExtractMusic({ musicXmlPath: path })}
            />
          </FieldGroup>
        </WorkspaceSection>

        <PropertiesSection title={t("ui.common.sections.properties")}>
          <PropertyGroup title={t("ui.groups.encoding")} contentClassName="gap-0 py-0">
            <EditorChartFormatField
              id="extract-music-chart-format"
              value={chartFormat}
              onChange={(value) => patchExtractMusic({ chartFormat: value })}
            />
            <HcaKeyField
              id="extract-music-hca-key"
              value={hcaKey}
              onChange={(value) => patchExtractMusic({ hcaKey: value })}
            />
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
