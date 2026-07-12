import { useTranslation } from "react-i18next";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { useApp } from "@/contexts/AppContext";
import appVersion from "../../../package.json";

export function SidebarBrand() {
  const { t } = useTranslation();
  const { runtimeInfo } = useApp();
  const version = runtimeInfo?.version ?? appVersion.version;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="grid h-14 w-full select-none grid-cols-[auto_minmax(0,1fr)] items-center gap-2 overflow-hidden rounded-xl px-3 text-left text-sm transition-[width,height,padding,gap,grid-template-columns] duration-200 ease-linear group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:grid-cols-[auto_0fr] group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-1!">
          <img
            src="/favicon.png"
            alt=""
            className="pointer-events-none size-8 shrink-0 object-contain transition-[width,height] duration-200 ease-linear group-data-[collapsible=icon]:size-6"
          />
          <div className="min-w-0 overflow-hidden transition-[opacity,transform] duration-200 ease-linear group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:scale-95 group-data-[collapsible=icon]:opacity-0">
            <div className="truncate text-sm font-medium">{t("ui.app.name")}</div>
            <div className="truncate text-xs text-muted-foreground">v{version}</div>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
