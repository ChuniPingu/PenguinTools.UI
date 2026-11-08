import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { openPath } from "@tauri-apps/plugin-opener";
import { FieldGroup } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkspaceSection } from "@/components/layout/WorkspaceSection";
import { ThemeSettingField } from "@/components/theme/ThemeSettingField";
import { LanguageSettingField } from "@/components/i18n/LanguageSettingField";
import { useApp } from "@/contexts/AppContext";
import { useAppUpdate } from "@/contexts/AppUpdateContext";
import { useAssetCatalog } from "@/contexts/AssetCatalogContext";
import { assetCollectArgs } from "@/lib/cli-commands";
import { useCliInfoStore } from "@/stores/cli-info-store";
import { usePageTask } from "@/hooks/use-page-task";
import { PageTaskStatus } from "@/components/layout/PageTaskStatus";
import { PageTaskDiagnostics } from "@/components/diagnostics/PageTaskDiagnostics";
import { pickPath } from "@/lib/file-picker";
import { userAssetsPath } from "@/lib/asset-catalog";
import { getRuntimeInfo, isTauriRuntime, type RuntimeInfo } from "@/lib/tauri-cli";
import { loadUiSettings, saveUiSettings } from "@/lib/ui-settings";
import { MiscCreditsSection } from "./misc/MiscCreditsSection";
import { MiscDebugSection } from "./misc/MiscDebugSection";
import { MiscGameAssetsSection } from "./misc/MiscGameAssetsSection";
import { MiscRuntimeSection } from "./misc/MiscRuntimeSection";
import { MiscUpdatesSection } from "./misc/MiscUpdatesSection";

function DebugForcedError({ active }: { active: boolean }) {
  if (active) {
    throw new Error("Debug: forced render error from Misc page.");
  }
  return null;
}

export function MiscPage() {
  const { t } = useTranslation();
  const { notifyError, notifyInfo, runtimeInfo, cliActionsBlocked } = useApp();
  const {
    status: updateStatus,
    availableUpdate,
    progress: updateProgress,
    updateBusy,
    checkForUpdates,
    installUpdate,
  } = useAppUpdate();
  const { refresh } = useAssetCatalog();
  const [localRuntimeInfo, setLocalRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [runtimeLoadFailed, setRuntimeLoadFailed] = useState(false);
  const task = usePageTask("misc");
  const {
    info: cliInfo,
    status: cliInfoStatus,
    refresh: refreshCliInfo,
    gameDirectory,
    setGameDirectory,
  } = useCliInfoStore();
  const cliInfoLoading = cliInfoStatus === "loading";
  const cliInfoLoadFailed = cliInfoStatus === "error";
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [forceError, setForceError] = useState(false);
  const info = runtimeInfo ?? localRuntimeInfo;
  const isBrowserPreview = !isTauriRuntime();

  useEffect(() => {
    if (isBrowserPreview) return;

    if (runtimeInfo) {
      setLocalRuntimeInfo(null);
      setRuntimeLoadFailed(false);
      void loadUiSettings(runtimeInfo.userDataDir)
        .then((settings) => {
          setGameDirectory(settings.gameDirectory);
          setAutoUpdate(settings.autoUpdate);
        })
        .catch((error) => notifyError(error instanceof Error ? error.message : String(error)));
      return;
    }

    setRuntimeLoadFailed(false);
    void getRuntimeInfo()
      .then((nextInfo) => {
        setLocalRuntimeInfo(nextInfo);
      })
      .catch(() => setRuntimeLoadFailed(true));
  }, [isBrowserPreview, notifyError, runtimeInfo, setGameDirectory]);

  const handleAutoUpdateChange = (checked: boolean) => {
    setAutoUpdate(checked);
    if (!runtimeInfo) return;
    void saveUiSettings(runtimeInfo.userDataDir, { autoUpdate: checked }).catch((error) =>
      notifyError(error instanceof Error ? error.message : String(error)),
    );
  };

  useEffect(() => {
    if (isBrowserPreview || !info || cliActionsBlocked || cliInfoStatus !== "idle") return;

    void refreshCliInfo();
  }, [isBrowserPreview, info, cliActionsBlocked, cliInfoStatus, refreshCliInfo]);

  const openDirectory = async (path: string | undefined, label: string) => {
    if (!isTauriRuntime()) {
      notifyInfo(t("ui.common.notify.unavailable"));
      return;
    }
    if (!path) {
      notifyError(t("ui.misc.notify.pathUnavailable", { label }));
      return;
    }

    try {
      await openPath(path);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleAssetCollect = async () => {
    if (!isTauriRuntime() || !runtimeInfo) {
      notifyInfo(t("ui.common.notify.unavailable"));
      return;
    }

    const gameRoot = await pickPath({
      historyKey: "system.gameDirectory",
      mode: "folder",
      defaultPath: gameDirectory || undefined,
    });
    if (!gameRoot) return;

    const output = userAssetsPath(runtimeInfo.userDataDir);
    const response = await task.runCommand(assetCollectArgs(gameRoot, output));
    if (!response?.success) return;
    try {
      await saveUiSettings(runtimeInfo.userDataDir, { gameDirectory: gameRoot });
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
      return;
    }
    setGameDirectory(gameRoot);
    await refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <DebugForcedError active={forceError} />
        <main className="w-full">
          <div>
            <WorkspaceSection title={t("ui.settings.appearance.title")}>
              <FieldGroup>
                <ThemeSettingField />
                <LanguageSettingField />
              </FieldGroup>
            </WorkspaceSection>

            <MiscRuntimeSection
              info={info}
              cliInfo={cliInfo}
              cliInfoLoadFailed={cliInfoLoadFailed}
              isBrowserPreview={isBrowserPreview}
              runtimeLoadFailed={runtimeLoadFailed}
              refreshDisabled={cliInfoLoading || cliActionsBlocked || isBrowserPreview || !info}
              onRefresh={() => void refreshCliInfo()}
              onOpenDirectory={(path, label) => void openDirectory(path, label)}
            />

            <MiscCreditsSection />

            <MiscUpdatesSection
              isBrowserPreview={isBrowserPreview}
              isDevBuild={import.meta.env.DEV}
              hasRuntimeInfo={runtimeInfo != null}
              autoUpdate={autoUpdate}
              onAutoUpdateChange={handleAutoUpdateChange}
              updateStatus={updateStatus}
              availableUpdate={availableUpdate}
              updateProgress={updateProgress}
              updateBusy={updateBusy}
              onCheckForUpdates={() => void checkForUpdates()}
              onInstallUpdate={() => void installUpdate()}
            />

            <MiscGameAssetsSection
              gameDirectory={gameDirectory}
              collectDisabled={task.busy || task.blocked}
              onCollect={() => void handleAssetCollect()}
            />

            {import.meta.env.DEV ? (
              <MiscDebugSection onForceError={() => setForceError(true)} />
            ) : null}
          </div>
        </main>
      </ScrollArea>
      <div className="flex min-h-13 items-center justify-end gap-2 border-t bg-muted/25 px-4 py-2 sm:px-6">
        <PageTaskStatus task={task} />
        <PageTaskDiagnostics task={task} />
      </div>
    </div>
  );
}
