import { useEffect, useRef } from "react";
import { isTauriRuntime } from "@/lib/tauri-cli";
import { openTrackedPathSession } from "@/lib/tracked-path-session";
import { useApp } from "@/contexts/AppContext";

export function useTrackedPathWatch(
  watchPath: string,
  trackedPaths: string[],
  onChanged: () => void,
) {
  const { notifyError } = useApp();
  const onChangedRef = useRef(onChanged);

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  const trackedKey = JSON.stringify(trackedPaths);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const trimmedPath = watchPath.trim();
    const paths = JSON.parse(trackedKey) as string[];
    if (!trimmedPath || paths.length === 0) return;
    const reportError = (error: unknown) =>
      notifyError(error instanceof Error ? error.message : String(error));
    const session = openTrackedPathSession(trimmedPath, paths, () => onChangedRef.current());
    void session.ready.catch(reportError);

    return () => {
      void session.dispose().catch(reportError);
    };
  }, [watchPath, trackedKey, notifyError]);
}
