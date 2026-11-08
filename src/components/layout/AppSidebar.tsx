import { NavLink, useLocation } from "react-router-dom";
import { useSyncExternalStore } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  getActivePageTasks,
  getActivePageIds,
  pageTaskRoutes,
  subscribePageTasks,
} from "@/lib/page-tasks";
import { useCliInfoStore } from "@/stores/cli-info-store";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarBrand } from "@/components/layout/SidebarBrand";
import { isNavItemActive, useNavGroups } from "@/lib/nav-items";

export function AppSidebar() {
  const location = useLocation();
  const navGroups = useNavGroups();
  useSyncExternalStore(subscribePageTasks, getActivePageIds, getActivePageIds);
  const checkingCli = useCliInfoStore((state) => state.status === "loading");
  const busyRoutes = new Set<string>(getActivePageTasks().map(([page]) => pageTaskRoutes[page]));
  if (checkingCli) busyRoutes.add("/misc");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={isNavItemActive(location.pathname, item.url)}
                      render={<NavLink to={item.url} />}
                      tooltip={item.title}
                      aria-label={item.title}
                      aria-busy={busyRoutes.has(item.url)}
                    >
                      {busyRoutes.has(item.url) ? <Spinner /> : <item.icon />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
