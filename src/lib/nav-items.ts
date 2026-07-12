import { useMemo } from "react";
import {
  AudioLinesIcon,
  FileIcon,
  ImageIcon,
  LayersIcon,
  MusicIcon,
  PackageIcon,
  SettingsIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { createExtractNavIcon, type NavIcon } from "@/lib/nav-extract-icon";

export interface NavItem {
  title: string;
  url: string;
  icon: NavIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface PageBreadcrumb {
  group: string;
  page: string;
}

const ExtractMusicIcon = createExtractNavIcon(MusicIcon);
const ExtractChartIcon = createExtractNavIcon(FileIcon);
const ExtractAudioIcon = createExtractNavIcon(AudioLinesIcon);
const ExtractStageIcon = createExtractNavIcon(LayersIcon);

export function useNavGroups(): NavGroup[] {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        label: t("ui.nav.groups.export"),
        items: [
          { title: t("ui.nav.pages.option"), url: "/option", icon: PackageIcon },
          { title: t("ui.nav.pages.song"), url: "/song", icon: MusicIcon },
        ],
      },
      {
        label: t("ui.nav.groups.convert"),
        items: [
          { title: t("ui.nav.pages.chart"), url: "/chart", icon: FileIcon },
          { title: t("ui.nav.pages.jacket"), url: "/jacket", icon: ImageIcon },
          { title: t("ui.nav.pages.audio"), url: "/audio", icon: AudioLinesIcon },
          { title: t("ui.nav.pages.stage"), url: "/stage", icon: LayersIcon },
        ],
      },
      {
        label: t("ui.nav.groups.extract"),
        items: [
          { title: t("ui.nav.pages.extractMusic"), url: "/extract/music", icon: ExtractMusicIcon },
          { title: t("ui.nav.pages.extractChart"), url: "/extract/chart", icon: ExtractChartIcon },
          { title: t("ui.nav.pages.extractAudio"), url: "/extract/audio", icon: ExtractAudioIcon },
          { title: t("ui.nav.pages.extractStage"), url: "/extract/stage", icon: ExtractStageIcon },
        ],
      },
      {
        label: t("ui.nav.groups.system"),
        items: [{ title: t("ui.nav.pages.misc"), url: "/misc", icon: SettingsIcon }],
      },
    ],
    [t],
  );
}

export function usePageBreadcrumb(pathname: string): PageBreadcrumb {
  const { t } = useTranslation();
  const navGroups = useNavGroups();

  return useMemo(() => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.url === pathname) {
          return { group: group.label, page: item.title };
        }
      }
    }

    const appName = t("ui.app.name");
    return { group: appName, page: appName };
  }, [navGroups, pathname, t]);
}
