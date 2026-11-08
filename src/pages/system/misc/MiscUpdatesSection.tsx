import { useTranslation } from "react-i18next";
import type { Update } from "@tauri-apps/plugin-updater";
import { Button } from "@/components/ui/button";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { ToggleField } from "@/components/layout/PropertyFields";
import type { UpdateProgress, UpdateStatus } from "@/lib/app-updater";
import { formatBytes } from "./format-bytes";
import { UpdateStatusBadge } from "./UpdateStatusBadge";

interface MiscUpdatesSectionProps {
  isBrowserPreview: boolean;
  isDevBuild: boolean;
  hasRuntimeInfo: boolean;
  autoUpdate: boolean;
  onAutoUpdateChange: (checked: boolean) => void;
  updateStatus: UpdateStatus;
  availableUpdate: Update | null;
  updateProgress: UpdateProgress | null;
  updateBusy: boolean;
  onCheckForUpdates: () => void;
  onInstallUpdate: () => void;
}

export function MiscUpdatesSection({
  isBrowserPreview,
  isDevBuild,
  hasRuntimeInfo,
  autoUpdate,
  onAutoUpdateChange,
  updateStatus,
  availableUpdate,
  updateProgress,
  updateBusy,
  onCheckForUpdates,
  onInstallUpdate,
}: Readonly<MiscUpdatesSectionProps>) {
  const { t } = useTranslation();

  const updatesDisabled = isBrowserPreview || isDevBuild;

  const updateStatusMessage = (() => {
    if (isBrowserPreview) return t("ui.common.unavailable");
    if (isDevBuild) return t("ui.misc.updates.status.devDisabled");
    switch (updateStatus) {
      case "checking":
        return t("ui.misc.updates.status.checking");
      case "available":
        return t("ui.misc.updates.status.available", {
          version: availableUpdate?.version ?? "",
        });
      case "upToDate":
        return t("ui.misc.updates.status.upToDate");
      case "downloading":
        return t("ui.misc.updates.status.downloading", {
          downloaded: formatBytes(updateProgress?.downloaded ?? 0),
          total:
            updateProgress?.contentLength != null
              ? formatBytes(updateProgress.contentLength)
              : t("ui.common.unknown"),
        });
      case "waitingForJob":
        return t("ui.misc.updates.status.waitingForJob");
      case "installing":
        return t("ui.misc.updates.status.installing");
      case "error":
        return t("ui.misc.updates.status.error");
      default:
        return null;
    }
  })();

  return (
    <WorkspaceSection title={t("ui.misc.updates.title")}>
      <div className="space-y-4">
        <ToggleField
          id="misc-auto-update"
          label={t("ui.properties.autoUpdate.label")}
          checked={autoUpdate}
          onChange={onAutoUpdateChange}
          disabled={updatesDisabled || !hasRuntimeInfo}
        />
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={updatesDisabled || updateBusy}
              onClick={onCheckForUpdates}
            >
              {t("ui.misc.actions.checkForUpdates")}
            </Button>
            {updateStatus === "available" ? (
              <Button
                type="button"
                disabled={updatesDisabled || updateBusy}
                onClick={onInstallUpdate}
              >
                {t("ui.misc.actions.installUpdate")}
              </Button>
            ) : null}
          </div>
          {updateStatusMessage ? (
            <UpdateStatusBadge status={updateStatus} message={updateStatusMessage} />
          ) : null}
        </div>
      </div>
    </WorkspaceSection>
  );
}
