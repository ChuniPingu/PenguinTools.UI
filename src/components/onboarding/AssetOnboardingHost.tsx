import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AssetOnboardingDialog } from "@/components/onboarding/AssetOnboardingDialog";
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
  const { runtimeInfo, runCliCommand, notifyError, isBusy } = useApp();
  const { refresh } = useAssetCatalog();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!isTauriRuntime() || !runtimeInfo || started.current) return;
    started.current = true;

    void (async () => {
      const settings = await loadUiSettings(runtimeInfo.userDataDir);
      const userAssets = userAssetsPath(runtimeInfo.userDataDir);
      const hasUserAssets = await pathExists(userAssets);
      const gameDir = settings.gameDirectory.trim();
      const gameDirExists = gameDir ? await pathExists(gameDir) : false;

      if (!hasUserAssets && !gameDirExists) {
        setDialogOpen(true);
        return;
      }

      if (gameDirExists) {
        setCollecting(true);
        try {
          const response = await runCliCommand(assetCollectArgs(gameDir, userAssets));
          if (response?.success) {
            await saveUiSettings(runtimeInfo.userDataDir, { gameDirectory: gameDir });
          }
          await refresh();
        } catch (error) {
          notifyError(error instanceof Error ? error.message : String(error));
          await refresh();
        } finally {
          setCollecting(false);
        }
        return;
      }

      await refresh();
    })();
  }, [notifyError, refresh, runCliCommand, runtimeInfo]);

  const handleBrowse = async () => {
    if (!runtimeInfo) return;
    const gameRoot = await pickPath({ mode: "folder" });
    if (!gameRoot) return;
    setCollecting(true);
    try {
      const output = userAssetsPath(runtimeInfo.userDataDir);
      const response = await runCliCommand(assetCollectArgs(gameRoot, output));
      if (!response?.success) {
        notifyError(t("ui.onboarding.errors.collectionFailed"));
        return;
      }
      await saveUiSettings(runtimeInfo.userDataDir, { gameDirectory: gameRoot });
      await refresh();
      setDialogOpen(false);
    } finally {
      setCollecting(false);
    }
  };

  return (
    <AssetOnboardingDialog
      open={dialogOpen}
      busy={collecting || isBusy}
      onBrowse={handleBrowse}
      onSkip={() => setDialogOpen(false)}
    />
  );
}
