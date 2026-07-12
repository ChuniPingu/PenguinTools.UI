import { useCallback, useEffect, useRef, useState } from "react";

export function useFileChangedReload({
  enabled,
  isBusy,
  onReload,
}: {
  enabled: boolean;
  isBusy: boolean;
  onReload: () => void;
}) {
  const [fileChangedAt, setFileChangedAt] = useState<Date | null>(null);
  const pendingReloadRef = useRef(false);
  const onReloadRef = useRef(onReload);

  useEffect(() => {
    onReloadRef.current = onReload;
  }, [onReload]);

  const handleFileChanged = useCallback(() => {
    setFileChangedAt(new Date());
    if (isBusy) {
      pendingReloadRef.current = true;
      return;
    }

    pendingReloadRef.current = false;
    onReloadRef.current();
  }, [isBusy]);

  useEffect(() => {
    if (!enabled || isBusy || !pendingReloadRef.current) return;
    pendingReloadRef.current = false;
    onReloadRef.current();
  }, [enabled, isBusy]);

  const clearFileChanged = useCallback(() => {
    setFileChangedAt(null);
  }, []);

  return { fileChangedAt, handleFileChanged, clearFileChanged };
}
