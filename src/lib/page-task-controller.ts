import {
  startCliQuery,
  startCliTask,
  CliTaskError,
  trackCliTask,
  type CliQuery,
} from "@/lib/cli-task";
import { collectOptionScanDiagnostics } from "@/lib/cli-results";
import { operationFromCliArgs } from "@/lib/cli-progress";
import type { CliDiagnosticPayload, CliProgressEvent, CliResponse } from "@/lib/cli-types";
import { resolveMessage } from "@/lib/messages";
import { t } from "@/i18n";
import { appendCliLine } from "@/stores/cli-output-store";
import type { TaskPage } from "@/lib/page-tasks";

export interface PageTaskSnapshot {
  status: "idle" | "waiting" | "running" | "cancelling" | "success" | "error" | "cancelled";
  operation: string | null;
  progress: CliProgressEvent | null;
  diagnostics: CliDiagnosticPayload[];
  error: string;
  result: CliResponse | null;
}
type TaskEnvironment = {
  blocked: () => boolean;
  prepare: (operation: string | null) => Promise<void> | undefined;
  complete: (response: CliResponse, diagnostics: CliDiagnosticPayload[]) => void;
  reportError: (message: string) => void;
};
type ActiveTask = {
  query: boolean;
  cancelled: boolean;
  handle?: ReturnType<typeof startCliTask>;
  promise?: Promise<CliResponse | null>;
};
const idle: PageTaskSnapshot = {
  status: "idle",
  operation: null,
  progress: null,
  diagnostics: [],
  error: "",
  result: null,
};
export function taskIsBusy(state: PageTaskSnapshot) {
  return state.status === "waiting" || state.status === "running" || state.status === "cancelling";
}

/** A page's task outlives its React subscribers and only applies the latest source's result. */
export class PageTaskController {
  private snapshot = idle;
  private listeners = new Set<() => void>();
  private active: ActiveTask | null = null;
  private source = "";
  private attempted = "";
  constructor(
    readonly page: TaskPage,
    private environment: TaskEnvironment,
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(snapshot: PageTaskSnapshot) {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
  hasAttempted = (path: string) => this.attempted === path.trim();
  setSource = (path: string) => {
    if (this.source === path.trim()) return;
    this.source = path.trim();
    this.attempted = "";
    this.reset();
  };
  reset = () => {
    // Editing the next input never cancels an export already writing its output.
    if (this.active && !this.active.query) return;
    this.cancel();
    if (!this.active) this.publish(idle);
  };
  cancel = () => {
    const current = this.active;
    if (!current || current.cancelled) return;
    current.cancelled = true;
    this.publish({ ...this.snapshot, status: "cancelling" });
    if (current.handle)
      void current.handle.cancel().catch((error) => {
        if (this.active !== current) return;
        current.cancelled = false;
        const message = taskError(error);
        this.publish({ ...this.snapshot, status: "running", error: message });
        this.environment.reportError(message);
      });
  };
  run = (query: CliQuery, onResult?: (response: CliResponse) => void) => {
    if (this.environment.blocked()) return Promise.resolve(null);
    if (this.active && !this.active.query) return Promise.resolve(null);
    this.source = query.path.trim();
    this.attempted = this.source;
    return this.launch(
      query.kind === "chartInspect" ? "chart.inspect" : "option.scan",
      query,
      onResult,
    );
  };
  runCommand = (args: string[], onResult?: (response: CliResponse) => void) => {
    if (this.environment.blocked() || this.active) return Promise.resolve(null);
    return this.launch(operationFromCliArgs(args), args, onResult);
  };
  private launch(
    operation: string | null,
    request: CliQuery | string[],
    onResult: ((response: CliResponse) => void) | undefined,
  ) {
    const previous = this.active;
    this.cancel();
    const current: ActiveTask = { query: !Array.isArray(request), cancelled: false };
    this.active = current;
    this.publish({ ...idle, status: "waiting", operation });
    const execute = async () => {
      try {
        // A replacement waits for native termination, so each page still owns at most one process.
        if (previous?.promise) await previous.promise;
        const preparation = this.environment.prepare(operation);
        if (preparation) await preparation;
        if (current.cancelled || this.active !== current) return null;
        this.publish({ ...this.snapshot, status: "running" });
        const progress = (value: CliProgressEvent) => {
          if (this.active === current && !current.cancelled)
            this.publish({ ...this.snapshot, progress: value });
        };
        current.handle = Array.isArray(request)
          ? startCliTask(this.page, request, progress)
          : startCliQuery(request, progress, this.page);
        const response = await current.handle.promise;
        if (this.active !== current || current.cancelled || !response) return null;
        const diagnostics =
          response.operation === "option.scan"
            ? collectOptionScanDiagnostics(response)
            : (response.diagnostics ?? []);
        // Apply results even when the originating page is unmounted.
        onResult?.(response);
        this.publish({
          ...this.snapshot,
          status: response.success ? "success" : "error",
          progress: null,
          diagnostics,
          result: response,
          error: response.success
            ? ""
            : response.message
              ? resolveMessage(response.message)
              : t("ui.tasks.failed"),
        });
        this.environment.complete(response, diagnostics);
        return response;
      } catch (error) {
        if (this.active !== current || current.cancelled) return null;
        const message = taskError(error);
        const detail =
          error && typeof error === "object" && "path" in error ? ` ${String(error.path)}` : "";
        appendCliLine(`[${this.page}] ${message}${detail}`);
        this.publish({
          ...this.snapshot,
          status: "error",
          progress: null,
          error: message,
        });
        this.environment.reportError(message);
        return null;
      } finally {
        if (this.active === current) {
          this.active = null;
          if (taskIsBusy(this.snapshot))
            this.publish({ ...this.snapshot, status: "cancelled", progress: null });
        }
      }
    };
    current.promise = trackCliTask(execute());
    return current.promise;
  }
}

export function taskError(error: unknown): string {
  if (error instanceof CliTaskError && error.exitCode === 124) return t("ui.query.notify.timedOut");
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "outputConflict") return t("ui.tasks.notify.outputConflict");
    if (error.code === "pageBusy") return t("ui.tasks.notify.pageBusy");
    if (error.code === "assetsBusy") return t("ui.tasks.notify.assetsBusy");
    if ("message" in error) return String(error.message);
  }
  if (error instanceof Error) return error.message || t("ui.tasks.notify.failed");
  return String(error);
}
