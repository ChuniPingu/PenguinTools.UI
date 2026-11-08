import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/tauri-cli";

/** Reveal the native window after React has committed the UI (or its error page). */
export function StartupWindow() {
  useEffect(() => {
    if (!isTauriRuntime()) return;

    // A new task lets the initial commit finish without depending on animation
    // frames, which a hidden WebView may suspend.
    const timer = window.setTimeout(() => {
      void invoke("show_main_window", {
        dark: document.documentElement.classList.contains("dark"),
      }).catch((error) => {
        console.error("Failed to show the main window:", error);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
