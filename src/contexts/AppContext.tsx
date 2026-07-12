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
import { toast } from "sonner";
import { t } from "@/i18n";
import type { CliDiagnosticPayload, CliResponse } from "@/lib/cli-types";
import { collectOptionScanDiagnostics, summarizeCliDiagnostics } from "@/lib/cli-results";
import { resolveMessage } from "@/lib/messages";
import {
  cancelCli,
  isTauriRuntime,
  prepareRuntime,
  runCli,
  subscribeCliEvents,
  type RuntimeInfo,
} from "@/lib/tauri-cli";

interface ProgressState {
  completed: number;
  total: number;
}

interface AppContextValue {
  statusDetail: string;
  isBusy: boolean;
  progress: ProgressState | null;
  runtimeInfo: RuntimeInfo | null;
  cliOutputLines: string[];
  cliOutputOpen: boolean;
  diagnostics: CliDiagnosticPayload[];
  diagnosticsOpen: boolean;
  setBusy: (busy: boolean, progress?: ProgressState | null) => void;
  showDiagnostics: (items?: CliDiagnosticPayload[]) => void;
  closeDiagnostics: () => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
  clearCliOutput: () => void;
  setCliOutputOpen: (open: boolean) => void;
  toggleCliOutput: () => void;
  runCliCommand: (
    args: string[],
    onResult?: (response: CliResponse) => void,
  ) => Promise<CliResponse | null>;
  cancelCliCommand: () => Promise<void>;
  waitForCliIdle: (onWaiting?: () => void) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const SILENT_SUCCESS_OPERATIONS = new Set(["info"]);

function formatProgressDetail(item?: string, label?: string): string {
  if (label && item) return `${label} (${item})`;
  return item ?? label ?? "";
}

function handleCliLine(
  line: string,
  appendLine: (line: string) => void,
  setStatusDetail: (detail: string) => void,
  setBusy: (busy: boolean, progress?: ProgressState | null) => void,
  showDiagnostics: (items: CliDiagnosticPayload[]) => void,
  notifySuccess: (message: string) => void,
  notifyError: (message: string) => void,
  notifyInfo: (message: string) => void,
  onResult?: (response: CliResponse) => void,
) {
  try {
    const payload = JSON.parse(line) as Record<string, unknown>;

    if (payload.type === "stderr") {
      appendLine(typeof payload.message === "string" ? payload.message : line);
      return;
    }

    appendLine(line);

    if (payload.type === "progress") {
      const completed = typeof payload.completed === "number" ? payload.completed : undefined;
      const total = typeof payload.total === "number" ? payload.total : undefined;
      const item = typeof payload.item === "string" ? payload.item : undefined;
      const label = typeof payload.label === "string" ? payload.label : undefined;

      setStatusDetail(formatProgressDetail(item, label));
      if (completed != null && total != null) {
        setBusy(true, { completed, total });
      } else {
        setBusy(true, null);
      }
      return;
    }

    if (payload.type === "result") {
      const response = payload as unknown as CliResponse;
      const diagnostics =
        response.operation === "option.scan"
          ? collectOptionScanDiagnostics(response)
          : (response.diagnostics ?? []);
      const message = response.message ? resolveMessage(response.message) : undefined;

      setBusy(false, null);
      if (response.success) {
        const summary = summarizeCliDiagnostics(diagnostics);
        if (message && !SILENT_SUCCESS_OPERATIONS.has(response.operation)) {
          notifySuccess(message);
        } else if (!message && summary) {
          notifyInfo(t("ui.cli.completedWith", { summary }));
        }
      } else {
        if (message) notifyError(message);
      }

      if (diagnostics.length > 0) {
        showDiagnostics(diagnostics);
      }

      onResult?.(response);
    }
  } catch {
    appendLine(line);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [statusDetail, setStatusDetail] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [cliOutputLines, setCliOutputLines] = useState<string[]>([]);
  const [cliOutputOpen, setCliOutputOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<CliDiagnosticPayload[]>([]);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const pendingResultHandler = useRef<((response: CliResponse) => void) | null>(null);
  const pendingCommandResolve = useRef<((response: CliResponse | null) => void) | null>(null);
  const lastResultRef = useRef<CliResponse | null>(null);
  const isBusyRef = useRef(false);
  const idleWaitersRef = useRef<Array<() => void>>([]);
  const cliHandlersRef = useRef({
    appendCliLine: (_line: string) => {},
    setBusy: (_busy: boolean, _progress?: ProgressState | null) => {},
    showDiagnostics: (_items?: CliDiagnosticPayload[]) => {},
    notifySuccess: (_message: string) => {},
    notifyError: (_message: string) => {},
    notifyInfo: (_message: string) => {},
  });

  const setBusy = useCallback((busy: boolean, nextProgress: ProgressState | null = null) => {
    isBusyRef.current = busy;
    setIsBusy(busy);
    setProgress(nextProgress);
    if (!busy) {
      setStatusDetail("");
      const waiters = idleWaitersRef.current;
      idleWaitersRef.current = [];
      for (const resolve of waiters) {
        resolve();
      }
    }
  }, []);

  const waitForCliIdle = useCallback((onWaiting?: () => void) => {
    if (!isBusyRef.current) {
      return Promise.resolve();
    }
    onWaiting?.();
    return new Promise<void>((resolve) => {
      if (!isBusyRef.current) {
        resolve();
        return;
      }
      idleWaitersRef.current.push(resolve);
    });
  }, []);

  const appendCliLine = useCallback((line: string) => {
    setCliOutputLines((current) => [...current, line]);
  }, []);

  const showDiagnostics = useCallback((items: CliDiagnosticPayload[] = []) => {
    setDiagnostics(items);
    setDiagnosticsOpen(true);
  }, []);

  const closeDiagnostics = useCallback(() => {
    setDiagnosticsOpen(false);
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

  const clearCliOutput = useCallback(() => {
    setCliOutputLines([]);
  }, []);

  const toggleCliOutput = useCallback(() => {
    setCliOutputOpen((open) => !open);
  }, []);

  useEffect(() => {
    cliHandlersRef.current = {
      appendCliLine,
      setBusy,
      showDiagnostics,
      notifySuccess,
      notifyError,
      notifyInfo,
    };
  }, [appendCliLine, notifyError, notifyInfo, notifySuccess, setBusy, showDiagnostics]);

  const runCliCommand = useCallback(
    async (args: string[], onResult?: (response: CliResponse) => void) => {
      if (!isTauriRuntime()) {
        notifyInfo(t("ui.cli.tauriOnly"));
        return null;
      }

      lastResultRef.current = null;
      pendingResultHandler.current = (response) => {
        lastResultRef.current = response;
        onResult?.(response);
      };
      setBusy(true, null);
      appendCliLine(`> PenguinTools.CLI ${args.join(" ")}`);

      return await new Promise<CliResponse | null>((resolve) => {
        pendingCommandResolve.current = resolve;
        void runCli(args).catch((error) => {
          pendingResultHandler.current = null;
          pendingCommandResolve.current = null;
          setBusy(false, null);
          const message = error instanceof Error ? error.message : String(error);
          notifyError(message);
          resolve(null);
        });
      });
    },
    [appendCliLine, notifyError, notifyInfo, setBusy],
  );

  const cancelCliCommand = useCallback(async () => {
    if (!isTauriRuntime()) return;
    try {
      await cancelCli();
      setBusy(false, null);
      notifyInfo(t("ui.cli.cancelled"));
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    }
  }, [notifyError, notifyInfo, setBusy]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void prepareRuntime()
      .then((info) => {
        if (!cancelled) {
          setRuntimeInfo(info);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          cliHandlersRef.current.notifyError(
            error instanceof Error ? error.message : String(error),
          );
        }
      });

    void (async () => {
      const unsubscribeFn = await subscribeCliEvents({
        onLine: (line) => {
          const handlers = cliHandlersRef.current;
          handleCliLine(
            line,
            handlers.appendCliLine,
            setStatusDetail,
            handlers.setBusy,
            handlers.showDiagnostics,
            handlers.notifySuccess,
            handlers.notifyError,
            handlers.notifyInfo,
            (response) => {
              pendingResultHandler.current?.(response);
              pendingResultHandler.current = null;
            },
          );
        },
        onFinished: (payload) => {
          const handlers = cliHandlersRef.current;
          const result = lastResultRef.current;
          pendingResultHandler.current = null;
          lastResultRef.current = null;
          const resolve = pendingCommandResolve.current;
          pendingCommandResolve.current = null;
          handlers.setBusy(false, null);
          if (payload.exitCode === 130) {
            handlers.notifyInfo(t("ui.cli.cancelled"));
          } else if (!payload.success && !result) {
            handlers.notifyError(t("ui.cli.exitedWithCode", { code: payload.exitCode }));
          }
          resolve?.(result);
        },
      });

      if (cancelled) {
        unsubscribeFn();
        return;
      }

      unsubscribe = unsubscribeFn;
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      statusDetail,
      isBusy,
      progress,
      runtimeInfo,
      cliOutputLines,
      cliOutputOpen,
      diagnostics,
      diagnosticsOpen,
      setBusy,
      showDiagnostics,
      closeDiagnostics,
      notifySuccess,
      notifyError,
      notifyInfo,
      clearCliOutput,
      setCliOutputOpen,
      toggleCliOutput,
      runCliCommand,
      cancelCliCommand,
      waitForCliIdle,
    }),
    [
      cancelCliCommand,
      clearCliOutput,
      cliOutputLines,
      cliOutputOpen,
      closeDiagnostics,
      diagnostics,
      diagnosticsOpen,
      isBusy,
      notifyError,
      notifyInfo,
      notifySuccess,
      progress,
      runCliCommand,
      runtimeInfo,
      setBusy,
      setCliOutputOpen,
      showDiagnostics,
      toggleCliOutput,
      statusDetail,
      waitForCliIdle,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider.");
  }
  return context;
}
