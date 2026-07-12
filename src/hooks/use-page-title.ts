import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { usePageBreadcrumb } from "@/lib/nav-items";
import { isTauriRuntime } from "@/lib/tauri-cli";

export function usePageTitle(): string {
  const { pathname } = useLocation();
  const { page: title } = usePageBreadcrumb(pathname);

  useEffect(() => {
    document.title = title;

    if (isTauriRuntime()) {
      void getCurrentWindow().setTitle(title);
    }
  }, [title]);

  return title;
}
