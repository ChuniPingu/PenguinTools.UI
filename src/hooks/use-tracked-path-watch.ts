import { useEffect, useRef } from "react";
import {
  isTauriRuntime,
  startTrackedPathWatch,
  stopTrackedPathWatch,
  subscribeTrackedPathChanged,
} from "@/lib/tauri-cli";

export function useTrackedPathWatch(
  watchPath: string,
  trackedPaths: string[],
  onChanged: () => void,
) {
  const onChangedRef = useRef(onChanged);

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  const trackedKey = trackedPaths.join("\0");

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const trimmedPath = watchPath.trim();
    if (!trimmedPath || trackedPaths.length === 0) {
      void stopTrackedPathWatch();
      return;
    }

    let unlistenChanged: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await startTrackedPathWatch(trimmedPath, trackedPaths);
        if (cancelled) return;
        unlistenChanged = await subscribeTrackedPathChanged(() => {
          onChangedRef.current();
        });
      } catch {
        // Scanning still works when live monitoring is unavailable.
      }
    })();

    return () => {
      cancelled = true;
      unlistenChanged?.();
      void stopTrackedPathWatch();
    };
  }, [watchPath, trackedKey, trackedPaths]);
}
