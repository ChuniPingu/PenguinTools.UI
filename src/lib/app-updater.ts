import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isTauriRuntime } from "@/lib/tauri-cli";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "upToDate"
  | "downloading"
  | "waitingForJob"
  | "installing"
  | "error";

export type UpdateProgress = {
  downloaded: number;
  contentLength: number | null;
};

export async function checkForAppUpdate(): Promise<Update | null> {
  if (!isTauriRuntime()) {
    throw new Error("Updates are only available in the Tauri app.");
  }
  return check();
}

function reportDownloadProgress(
  event: DownloadEvent,
  state: { downloaded: number; contentLength: number | null },
  onProgress?: (progress: UpdateProgress) => void,
): void {
  switch (event.event) {
    case "Started":
      state.contentLength = event.data.contentLength ?? null;
      state.downloaded = 0;
      onProgress?.({ downloaded: state.downloaded, contentLength: state.contentLength });
      break;
    case "Progress":
      state.downloaded += event.data.chunkLength;
      onProgress?.({ downloaded: state.downloaded, contentLength: state.contentLength });
      break;
    case "Finished":
      onProgress?.({ downloaded: state.downloaded, contentLength: state.contentLength });
      break;
  }
}

export async function downloadUpdate(
  update: Update,
  onProgress?: (progress: UpdateProgress) => void,
): Promise<void> {
  const state = { downloaded: 0, contentLength: null as number | null };
  await update.download((event) => reportDownloadProgress(event, state, onProgress));
}

export async function installDownloadedUpdate(update: Update): Promise<void> {
  await update.install();
}

export async function relaunchApp(): Promise<void> {
  await relaunch();
}
