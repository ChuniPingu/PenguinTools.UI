import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { parseCliJsonLine } from "@/lib/cli-json";
import { parseCliInfoResult, type CliInfoData } from "@/lib/cli-results";
import type { CliResponse } from "@/lib/cli-types";
import { trackCliTask } from "@/lib/cli-task";

export interface RuntimeInfo {
  version: string;
  buildDateUtc: string;
  root: string;
  cliExe: string;
  assetsDir: string;
  userDataDir: string;
  tempDir: string;
  extracted: boolean;
}

export interface CliFinishedPayload {
  exitCode: number;
  success: boolean;
}

export function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function prepareRuntime() {
  return await invoke<RuntimeInfo>("prepare_runtime");
}

export async function getRuntimeInfo() {
  return await invoke<RuntimeInfo>("get_runtime_info");
}

let cliInfoRequest: Promise<CliInfoData> | null = null;

/** Read-only metadata query, independent of the foreground CLI job and its events. */
export function getCliInfo(): Promise<CliInfoData> {
  cliInfoRequest ??= trackCliTask(
    invoke<string>("get_cli_info")
      .then((output) => {
        for (const line of output.split(/\r?\n/)) {
          let payload: unknown;
          try {
            payload = parseCliJsonLine(line);
          } catch {
            continue;
          }
          if (payload == null || typeof payload !== "object" || !("type" in payload)) continue;
          if (payload.type !== "result") continue;
          const info = parseCliInfoResult(payload as CliResponse);
          if (info) return info;
        }
        throw new Error("CLI info response was missing or invalid.");
      })
      .finally(() => {
        cliInfoRequest = null;
      }),
  );
  return cliInfoRequest;
}

export async function runCli(args: string[]) {
  return await invoke<void>("run_cli", { args });
}

export async function cancelCli() {
  return await invoke<void>("cancel_cli");
}

export function subscribeCliOutput(onLine: (line: string) => void) {
  return listen<string>("cli://output", (event) => {
    onLine(event.payload);
  });
}

export function subscribeCliFinished(onFinished: (payload: CliFinishedPayload) => void) {
  return listen<CliFinishedPayload>("cli://finished", (event) => {
    onFinished(event.payload);
  });
}

export async function subscribeCliEvents(handlers: {
  onLine: (line: string) => void;
  onFinished: (payload: CliFinishedPayload) => void;
}): Promise<() => void> {
  const unlistenOutput = await subscribeCliOutput(handlers.onLine);
  try {
    const unlistenFinished = await subscribeCliFinished(handlers.onFinished);
    return () => {
      unlistenOutput();
      unlistenFinished();
    };
  } catch (error) {
    unlistenOutput();
    throw error;
  }
}

export async function startTrackedPathWatch(watchPath: string, trackedPaths: string[]) {
  return await invoke<void>("start_tracked_path_watch", { watchPath, trackedPaths });
}

export async function stopTrackedPathWatch() {
  return await invoke<void>("stop_tracked_path_watch");
}

export function subscribeTrackedPathChanged(onChanged: (path: string) => void) {
  return listen<string>("tracked-path://changed", (event) => {
    onChanged(event.payload);
  });
}
