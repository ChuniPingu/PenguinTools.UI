import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AssetOnboardingDialog } from "@/components/onboarding/AssetOnboardingDialog";
import { usePageTask } from "@/hooks/use-page-task";
import { useApp } from "@/contexts/AppContext";
import { useAssetCatalog } from "@/contexts/AssetCatalogContext";
import { pathExists } from "@/lib/app-fs";
import { userAssetsPath } from "@/lib/asset-catalog";
import { assetCollectArgs } from "@/lib/cli-commands";
import { pickPath } from "@/lib/file-picker";
import { isTauriRuntime } from "@/lib/tauri-cli";
import { loadUiSettings, saveUiSettings } from "@/lib/ui-settings";

export function AssetOnboardingHost() {
  const { t } = useTranslation();
  const { runtimeInfo, notifyError } = useApp();
  const task = usePageTask("misc");
  const { runCommand } = task;
  const { refresh } = useAssetCatalog();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!isTauriRuntime() || !runtimeInfo || started.current) return;
    started.current = true;
    let cancelled = false;

    const collectGameAssets = async (gameDir: string, userAssets: string) => {
      setCollecting(true);
      try {
        const response = await runCommand(assetCollectArgs(gameDir, userAssets));
        if (cancelled) return;
        if (response?.success) {
          await saveUiSettings(runtimeInfo.userDataDir, { gameDirectory: gameDir });
        }
        if (cancelled) return;
        await refresh();
      } catch (error) {
        if (cancelled) return;
        notifyError(error instanceof Error ? error.message : String(error));
        await refresh();
      } finally {
        if (!cancelled) setCollecting(false);
      }
    };

    void (async () => {
      const settings = await loadUiSettings(runtimeInfo.userDataDir);
      if (cancelled) return;

      const userAssets = userAssetsPath(runtimeInfo.userDataDir);
      const hasUserAssets = await pathExists(userAssets);
      if (cancelled) return;

      const gameDir = settings.gameDirectory.trim();
      const gameDirExists = gameDir ? await pathExists(gameDir) : false;
      if (cancelled) return;

      if (!hasUserAssets && !gameDirExists) {
        setDialogOpen(true);
        return;
      }

      if (gameDirExists) {
        await collectGameAssets(gameDir, userAssets);
        return;
      }

      await refresh();
    })().catch((error) => {
      if (!cancelled) notifyError(error instanceof Error ? error.message : String(error));
    });

    return () => {
      cancelled = true;
    };
  }, [notifyError, refresh, runCommand, runtimeInfo]);

  const handleBrowse = async () => {
    if (!runtimeInfo) return;
    const gameRoot = await pickPath({ historyKey: "onboarding.gameDirectory", mode: "folder" });
    if (!gameRoot) return;
    setCollecting(true);
    try {
      const output = userAssetsPath(runtimeInfo.userDataDir);
      const response = await runCommand(assetCollectArgs(gameRoot, output));
      if (!response?.success) {
        notifyError(t("ui.onboarding.notify.collectionFailed"));
        return;
      }
      await saveUiSettings(runtimeInfo.userDataDir, { gameDirectory: gameRoot });
      await refresh();
      setDialogOpen(false);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setCollecting(false);
    }
  };

  return (
    <AssetOnboardingDialog
      open={dialogOpen}
      busy={collecting || task.busy || task.blocked}
      onBrowse={handleBrowse}
      onSkip={() => setDialogOpen(false)}
    />
  );
}
