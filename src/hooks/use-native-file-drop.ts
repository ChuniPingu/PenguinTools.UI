import { useEffect, useRef, useState } from "react";
import type { PhysicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { isTauriRuntime } from "@/lib/tauri-cli";
import { nativeDropZoneFrom } from "@/lib/convert-ui";

function dropTargetAt(position: PhysicalPosition): string | null {
  const scale = window.devicePixelRatio || 1;
  const element = document.elementFromPoint(position.x / scale, position.y / scale);
  return nativeDropZoneFrom(element);
}

export function useNativeFileDrop(onDrop: (paths: string[], target: string | null) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const activeTargetRef = useRef<string | null>(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsDragging(true);
          const target = dropTargetAt(event.payload.position);
          activeTargetRef.current = target;
          setActiveTarget(target);
        } else if (event.payload.type === "leave") {
          setIsDragging(false);
          setActiveTarget(null);
          activeTargetRef.current = null;
        } else if (event.payload.type === "drop") {
          const target = dropTargetAt(event.payload.position) ?? activeTargetRef.current;
          setIsDragging(false);
          setActiveTarget(null);
          activeTargetRef.current = null;
          onDropRef.current(event.payload.paths, target);
        }
      })
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return { isDragging, activeTarget };
}
