import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { isTauriRuntime, prepareRuntime, type RuntimeInfo } from "@/lib/tauri-cli";
import { setPageTasksBlocked, subscribeTaskResults, subscribeTaskErrors } from "@/lib/page-tasks";
import { waitForCliTasks } from "@/lib/cli-task";
import { presentTaskResult } from "@/lib/page-task-feedback";

interface AppContextValue {
  cliActionsBlocked: boolean;
  runtimeInfo: RuntimeInfo | null;
  setCliActionsBlocked: (blocked: boolean) => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
  waitForCliIdle: (onWaiting?: () => void) => Promise<void>;
}
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [cliActionsBlocked, setCliActionsBlocked] = useState(false);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const setCliActionsBlockedState = useCallback((blocked: boolean) => {
    setPageTasksBlocked(blocked);
    setCliActionsBlocked(blocked);
  }, []);
  const notifySuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);
  const notifyError = useCallback((message: string) => {
    toast.error(message);
  }, []);
  const notifyInfo = useCallback((message: string) => {
    toast.info(message);
  }, []);
  useEffect(
    () =>
      subscribeTaskResults((result) => {
        presentTaskResult(result, { notifyError });
      }),
    [notifyError],
  );
  useEffect(() => subscribeTaskErrors(({ message }) => notifyError(message)), [notifyError]);
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let cancelled = false;
    void prepareRuntime()
      .then((info) => {
        if (!cancelled) setRuntimeInfo(info);
      })
      .catch((error) => {
        if (!cancelled) notifyError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [notifyError]);
  const value = useMemo<AppContextValue>(
    () => ({
      cliActionsBlocked,
      runtimeInfo,
      setCliActionsBlocked: setCliActionsBlockedState,
      notifySuccess,
      notifyError,
      notifyInfo,
      waitForCliIdle: waitForCliTasks,
    }),
    [
      cliActionsBlocked,
      runtimeInfo,
      setCliActionsBlockedState,
      notifySuccess,
      notifyError,
      notifyInfo,
    ],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider.");
  return context;
}
