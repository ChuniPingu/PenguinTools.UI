import { Channel, invoke } from "@tauri-apps/api/core";
import { parseCliJsonLine } from "@/lib/cli-json";
import type { CliProgressEvent, CliResponse } from "@/lib/cli-types";
import { operationFromCliArgs } from "@/lib/cli-progress";
import { chartInspectArgs, optionScanArgs } from "@/lib/cli-commands";
import { appendCliLine } from "@/stores/cli-output-store";
import { useCliActivityStore } from "@/stores/cli-activity-store";

export type CliQuery =
  | { kind: "chartInspect"; path: string }
  | { kind: "optionScan"; path: string; chartFileDiscovery?: string; batchSize?: number };

type QueryEvent =
  | { type: "output" | "stderr"; line: string }
  | { type: "finished"; exitCode: number };

export class CliTaskError extends Error {
  constructor(
    public readonly exitCode: number,
    message: string,
  ) {
    super(message);
  }
}

const activeTasks = new Set<Promise<unknown>>();

export function trackCliTask<T>(promise: Promise<T>): Promise<T> {
  activeTasks.add(promise);
  void promise.then(
    () => activeTasks.delete(promise),
    () => activeTasks.delete(promise),
  );
  return promise;
}

export async function waitForCliTasks(onWaiting?: () => void) {
  if (activeTasks.size) onWaiting?.();
  while (activeTasks.size) await Promise.allSettled(activeTasks);
}

export function startCliQuery(
  query: CliQuery,
  onProgress: (progress: CliProgressEvent) => void,
  page: string = crypto.randomUUID(),
) {
  return startProcess(
    "start_cli_query",
    { query, page },
    query.kind === "chartInspect"
      ? chartInspectArgs(query.path)
      : optionScanArgs(query.path, query),
    onProgress,
  );
}

export function startCliTask(
  page: string,
  args: string[],
  onProgress: (progress: CliProgressEvent) => void,
) {
  return startProcess("start_cli_task", { page, args }, args, onProgress);
}

function startProcess(
  command: string,
  parameters: { page: string; query?: CliQuery; args?: string[] },
  args: string[],
  onProgress: (progress: CliProgressEvent) => void,
) {
  appendCliLine(`[${parameters.page}] > PenguinTools.CLI ${args.join(" ")}`);
  const operation = operationFromCliArgs(args);
  const id = crypto.randomUUID();
  const activity = useCliActivityStore.getState();
  activity.start(id, operation);
  const events = new Channel<QueryEvent>();
  let response: CliResponse | null = null;
  let stderr = "";
  let finished = false;
  let resolve!: (response: CliResponse | null) => void;
  let reject!: (error: unknown) => void;
  const promise = trackCliTask(
    new Promise<CliResponse | null>((complete, fail) => {
      resolve = complete;
      reject = fail;
    }),
  );
  events.onmessage = (event) => {
    if (finished) return;
    if (event.type === "finished") {
      finished = true;
      const status =
        event.exitCode === 130
          ? "cancelled"
          : event.exitCode === 0 && response?.success
            ? "success"
            : "error";
      activity.finish(id, status, {
        message:
          response && status !== "cancelled" && (status === "success" || !response.success)
            ? response.message
            : null,
        output: status === "error" ? stderr : undefined,
      });
      if (event.exitCode === 130) resolve(null);
      else if (event.exitCode === 124 || !response)
        reject(new CliTaskError(event.exitCode, stderr));
      else
        resolve(
          event.exitCode === 0
            ? response
            : {
                ...response,
                success: false,
                exitCode: event.exitCode,
                message: response.success ? undefined : response.message,
              },
        ); // Keep partial scan results.
      return;
    }
    appendCliLine(`[${parameters.page}] ${event.line}`);
    if (event.type === "stderr") {
      stderr = event.line;
      activity.update(id, { output: event.line });
      return;
    }
    let payload: unknown;
    try {
      payload = parseCliJsonLine(event.line);
    } catch {
      activity.update(id, { output: event.line });
      return;
    }
    if (
      !payload ||
      typeof payload !== "object" ||
      !("operation" in payload) ||
      (command === "start_cli_query" && payload.operation !== operation) ||
      !("type" in payload)
    )
      return;
    if (payload.type === "result") response = payload as CliResponse;
    else if (payload.type === "progress") {
      activity.update(id, { progress: payload as CliProgressEvent, output: undefined });
      onProgress(payload as CliProgressEvent);
    }
  };
  const launched = invoke<void>(command, { id, ...parameters, events });
  void launched.catch((error) => {
    if (finished) return;
    finished = true;
    activity.finish(id, "error", {
      output: error instanceof Error ? error.message : String(error),
    });
    reject(error);
  });
  return {
    promise,
    async cancel() {
      // A quick source change can happen before the native process has registered its ID.
      await launched;
      if (!finished) await invoke<void>("cancel_cli_task", { id });
    },
  };
}
