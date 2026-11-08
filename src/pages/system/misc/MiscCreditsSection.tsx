import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { isTauriRuntime } from "@/lib/tauri-cli";

const MAINTAINERS = [
  { handle: "Foahh", url: "https://space.bilibili.com/11057059" },
  { handle: "Giftia", url: "https://space.bilibili.com/3546945549240527" },
] as const;

export function MiscCreditsSection() {
  const { t } = useTranslation();

  return (
    <WorkspaceSection title={t("ui.misc.sections.credits")}>
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">{t("ui.misc.credits.thanks")}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {MAINTAINERS.map(({ handle, url }) => (
            <a
              key={handle}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
              onClick={(event) => {
                if (!isTauriRuntime()) return;
                event.preventDefault();
                void openUrl(url);
              }}
            >
              {handle}
            </a>
          ))}
        </div>
      </div>
    </WorkspaceSection>
  );
}
