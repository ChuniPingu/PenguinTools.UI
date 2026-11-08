import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  InspectorPanel,
  InspectorRow,
  InspectorSection,
} from "@/components/layout/PropertyInspector";
import type { ChartInspectData } from "@/lib/cli-results";

export function MetadataOnlyInspection({ data }: Readonly<{ data: ChartInspectData }>) {
  const { t } = useTranslation();
  const { chart } = data;
  return (
    <InspectorPanel title={t("ui.common.sections.properties")} standardHeading>
      <Alert>
        <AlertDescription>{t("ui.chart.metadataOnly")}</AlertDescription>
      </Alert>
      <InspectorSection title={t("ui.groups.song")}>
        <InspectorRow label={t("ui.chart.preview.title")} value={chart.title} />
        <InspectorRow label={t("ui.chart.preview.artist")} value={chart.artist} />
        <InspectorRow label={t("ui.properties.songId.label")} value={chart.songId} mono />
      </InspectorSection>
      <InspectorSection title={t("ui.groups.chart")}>
        <InspectorRow label={t("ui.chart.formatVersion")} value={data.formatVersion} />
        <InspectorRow label={t("ui.chart.fields.designer")} value={chart.designer} />
        <InspectorRow label={t("ui.chart.fields.difficulty")} value={chart.difficulty} />
        <InspectorRow label={t("ui.chart.preview.level")} value={chart.level} />
        <InspectorRow label={t("ui.properties.displayBpm.label")} value={chart.mainBpm} />
      </InspectorSection>
    </InspectorPanel>
  );
}
