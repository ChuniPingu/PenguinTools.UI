import {
  startTrackedPathWatch,
  stopTrackedPathWatch,
  subscribeTrackedPathChanged,
} from "@/lib/tauri-cli";

// Tauri owns one watcher. Complete each session's setup and cleanup before
// starting its replacement, even if a page changes while an invoke is pending.
let pending: Promise<void> = Promise.resolve();

function enqueue(action: () => Promise<void>): Promise<void> {
  const task = pending.then(action);
  pending = task.catch(() => {});
  return task;
}

export function openTrackedPathSession(
  path: string,
  trackedPaths: string[],
  onChanged: () => void,
) {
  let disposed = false;
  let started = false;
  let unlisten: (() => void) | undefined;
  const releaseListener = () => {
    unlisten?.();
    unlisten = undefined;
  };
  const ready = enqueue(async () => {
    if (disposed) return;
    unlisten = await subscribeTrackedPathChanged(() => {
      if (!disposed) onChanged();
    });
    if (disposed) {
      releaseListener();
      return;
    }
    try {
      await startTrackedPathWatch(path, trackedPaths);
      started = true;
    } catch (error) {
      releaseListener();
      throw error;
    }
  });

  return {
    ready,
    dispose() {
      disposed = true;
      releaseListener();
      return enqueue(async () => {
        if (started) {
          started = false;
          await stopTrackedPathWatch();
        }
      });
    },
  };
}
