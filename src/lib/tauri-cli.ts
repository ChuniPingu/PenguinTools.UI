import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

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
  return invoke<RuntimeInfo>("prepare_runtime");
}

export async function getRuntimeInfo() {
  return invoke<RuntimeInfo>("get_runtime_info");
}

export async function runCli(args: string[]) {
  return invoke<void>("run_cli", { args });
}

export async function cancelCli() {
  return invoke<void>("cancel_cli");
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
  const unlistenFinished = await subscribeCliFinished(handlers.onFinished);

  return () => {
    unlistenOutput();
    unlistenFinished();
  };
}

export async function startTrackedPathWatch(watchPath: string, trackedPaths: string[]) {
  return invoke<void>("start_tracked_path_watch", { watchPath, trackedPaths });
}

export async function stopTrackedPathWatch() {
  return invoke<void>("stop_tracked_path_watch");
}

export function subscribeTrackedPathChanged(onChanged: (path: string) => void) {
  return listen<string>("tracked-path://changed", (event) => {
    onChanged(event.payload);
  });
}
