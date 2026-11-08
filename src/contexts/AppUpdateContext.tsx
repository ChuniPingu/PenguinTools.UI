import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Update } from "@tauri-apps/plugin-updater";
import { useApp } from "@/contexts/AppContext";
import {
  checkForAppUpdate,
  downloadUpdate,
  installDownloadedUpdate,
  relaunchApp,
  type UpdateProgress,
  type UpdateStatus,
} from "@/lib/app-updater";
import { isTauriRuntime } from "@/lib/tauri-cli";
import { loadUiSettings } from "@/lib/ui-settings";
import { t } from "@/i18n";

interface AppUpdateContextValue {
  status: UpdateStatus;
  availableUpdate: Update | null;
  progress: UpdateProgress | null;
  updateBusy: boolean;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

function updateErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function AppUpdateProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { notifyError, notifyInfo, waitForCliIdle, runtimeInfo, setCliActionsBlocked } = useApp();
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const autoCheckedRef = useRef(false);

  const updateBusy =
    status === "checking" ||
    status === "downloading" ||
    status === "waitingForJob" ||
    status === "installing";

  useEffect(() => {
    const blocked =
      status === "downloading" || status === "waitingForJob" || status === "installing";
    setCliActionsBlocked(blocked);
    return () => setCliActionsBlocked(false);
  }, [setCliActionsBlocked, status]);

  const applyUpdate = useCallback(
    async (update: Update, options?: { announceAvailable?: boolean }) => {
      setStatus("downloading");
      setProgress(null);
      notifyInfo(
        options?.announceAvailable
          ? t("ui.misc.updates.notify.downloadingAvailable", { version: update.version })
          : t("ui.misc.updates.notify.downloading"),
      );

      try {
        await downloadUpdate(update, setProgress);
        await waitForCliIdle(() => setStatus("waitingForJob"));
        setStatus("installing");
        notifyInfo(t("ui.misc.updates.notify.installing"));
        await installDownloadedUpdate(update);
        await relaunchApp();
      } catch (error) {
        setStatus("error");
        notifyError(updateErrorMessage(error));
      }
    },
    [notifyError, notifyInfo, waitForCliIdle],
  );

  const checkForUpdates = useCallback(
    async (options?: { autoInstall?: boolean; startup?: boolean }) => {
      if (import.meta.env.DEV) {
        if (!options?.startup) {
          notifyInfo(t("ui.misc.updates.notify.devDisabled"));
        }
        return;
      }

      if (!isTauriRuntime()) {
        notifyInfo(t("ui.common.notify.unavailable"));
        return;
      }

      setAvailableUpdate(null);
      setProgress(null);
      setStatus("checking");

      try {
        const update = await checkForAppUpdate();
        if (!update) {
          setStatus("upToDate");
          return;
        }
        setAvailableUpdate(update);
        setStatus("available");
        if (options?.autoInstall) {
          await applyUpdate(update, { announceAvailable: true });
          return;
        }
        notifyInfo(
          options?.startup
            ? t("ui.misc.updates.notify.availableGoToSettings", {
                version: update.version,
              })
            : t("ui.misc.updates.notify.available", { version: update.version }),
        );
      } catch (error) {
        setStatus("error");
        setAvailableUpdate(null);
        notifyError(updateErrorMessage(error));
      }
    },
    [applyUpdate, notifyError, notifyInfo],
  );

  const installUpdate = useCallback(async () => {
    if (import.meta.env.DEV || !availableUpdate) return;
    await applyUpdate(availableUpdate);
  }, [applyUpdate, availableUpdate]);

  useEffect(() => {
    if (!isTauriRuntime() || !runtimeInfo || autoCheckedRef.current || import.meta.env.DEV) return;
    autoCheckedRef.current = true;
    void loadUiSettings(runtimeInfo.userDataDir)
      .then((settings) => checkForUpdates({ autoInstall: settings.autoUpdate, startup: true }))
      .catch((error) => notifyError(error instanceof Error ? error.message : String(error)));
  }, [checkForUpdates, notifyError, runtimeInfo]);

  const value = useMemo<AppUpdateContextValue>(
    () => ({
      status,
      availableUpdate,
      progress,
      updateBusy,
      checkForUpdates: () => checkForUpdates(),
      installUpdate,
    }),
    [availableUpdate, checkForUpdates, installUpdate, progress, status, updateBusy],
  );

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}

export function useAppUpdate() {
  const context = useContext(AppUpdateContext);
  if (!context) {
    throw new Error("useAppUpdate must be used within AppUpdateProvider.");
  }
  return context;
}
