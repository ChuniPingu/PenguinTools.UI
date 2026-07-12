import { useEffect, useState, type ComponentProps, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WindowChromeIcons } from "@/components/layout/window-chrome-icons";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePageBreadcrumb } from "@/lib/nav-items";
import { isTauriRuntime } from "@/lib/tauri-cli";
import { cn } from "@/lib/utils";

const windowChromeIconProps = {
  className: "shrink-0",
  "aria-hidden": true,
} as const;

function ChromeButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center",
        "appearance-none rounded-none border-0 bg-transparent p-0",
        "text-foreground outline-none transition-colors",
        "hover:bg-foreground/10 active:bg-foreground/15",
        className,
      )}
      {...props}
    />
  );
}

function handleDragMouseDown(event: MouseEvent<HTMLDivElement>) {
  if (event.button !== 0) return;

  const appWindow = getCurrentWindow();
  if (event.detail === 2) {
    void appWindow.toggleMaximize();
  } else {
    void appWindow.startDragging();
  }
}

export function TitleBar() {
  const { t } = useTranslation();
  const [maximized, setMaximized] = useState(false);
  const { pathname } = useLocation();
  const { group, page } = usePageBreadcrumb(pathname);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const appWindow = getCurrentWindow();
    void appWindow.isMaximized().then(setMaximized);

    let unlisten: (() => void) | undefined;
    void appWindow
      .onResized(async () => {
        setMaximized(await appWindow.isMaximized());
      })
      .then((dispose) => {
        unlisten = dispose;
      });

    return () => {
      unlisten?.();
    };
  }, []);

  if (!isTauriRuntime()) return null;

  const appWindow = getCurrentWindow();

  return (
    <header className="relative z-[100] flex h-(--title-bar-height) shrink-0 items-center overflow-hidden border-b bg-background">
      <div
        className="relative z-[1] flex min-w-0 flex-1 items-center gap-2 px-4 select-none"
        onMouseDown={handleDragMouseDown}
      >
        <SidebarTrigger className="-ml-1" onMouseDown={(event) => event.stopPropagation()} />
        <Separator orientation="vertical" className="pointer-events-none mr-2" />
        <Breadcrumb className="pointer-events-none min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="hidden md:block">
              <span className="text-muted-foreground">{group}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">{page}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="relative z-10 flex shrink-0" onMouseDown={(event) => event.stopPropagation()}>
        <ChromeButton
          aria-label={t("ui.windowChrome.minimize")}
          onClick={() => void appWindow.minimize()}
        >
          {WindowChromeIcons.minimizeWin(windowChromeIconProps)}
        </ChromeButton>
        <ChromeButton
          aria-label={maximized ? t("ui.windowChrome.restore") : t("ui.windowChrome.maximize")}
          onClick={() => void appWindow.toggleMaximize()}
        >
          {maximized
            ? WindowChromeIcons.maximizeRestoreWin(windowChromeIconProps)
            : WindowChromeIcons.maximizeWin(windowChromeIconProps)}
        </ChromeButton>
        <ChromeButton
          aria-label={t("ui.windowChrome.close")}
          className="hover:bg-[#e81123] hover:text-white active:bg-[#bf0f1d] active:text-white"
          onClick={() => void appWindow.close()}
        >
          {WindowChromeIcons.closeWin(windowChromeIconProps)}
        </ChromeButton>
      </div>
    </header>
  );
}
