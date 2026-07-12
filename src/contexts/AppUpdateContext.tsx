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

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const { notifyError, notifyInfo, waitForCliIdle } = useApp();
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const autoCheckedRef = useRef(false);

  const updateBusy =
    status === "checking" ||
    status === "downloading" ||
    status === "waitingForJob" ||
    status === "installing";

  const checkForUpdates = useCallback(async () => {
    if (!isTauriRuntime()) {
      notifyInfo(t("ui.misc.updates.tauriOnly"));
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
      notifyInfo(t("ui.misc.updates.notify.available", { version: update.version }));
    } catch (error) {
      setStatus("error");
      setAvailableUpdate(null);
      notifyError(updateErrorMessage(error));
    }
  }, [notifyError, notifyInfo]);

  const installUpdate = useCallback(async () => {
    if (!availableUpdate) return;

    setStatus("downloading");
    setProgress(null);
    notifyInfo(t("ui.misc.updates.notify.downloading"));

    try {
      await downloadUpdate(availableUpdate, setProgress);
      await waitForCliIdle(() => setStatus("waitingForJob"));
      setStatus("installing");
      notifyInfo(t("ui.misc.updates.notify.installing"));
      await installDownloadedUpdate(availableUpdate);
      await relaunchApp();
    } catch (error) {
      setStatus("error");
      notifyError(updateErrorMessage(error));
    }
  }, [availableUpdate, notifyError, notifyInfo, waitForCliIdle]);

  useEffect(() => {
    if (!isTauriRuntime() || autoCheckedRef.current) return;
    autoCheckedRef.current = true;
    void checkForUpdates();
  }, [checkForUpdates]);

  const value = useMemo<AppUpdateContextValue>(
    () => ({
      status,
      availableUpdate,
      progress,
      updateBusy,
      checkForUpdates,
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
