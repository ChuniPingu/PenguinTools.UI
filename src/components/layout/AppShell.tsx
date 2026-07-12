import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { StatusBar } from "@/components/layout/StatusBar";
import { DiagnosticsPanel } from "@/components/diagnostics/DiagnosticsPanel";
import { TitleBar } from "@/components/layout/TitleBar";
import { usePageTitle } from "@/hooks/use-page-title";
import { useApp } from "@/contexts/AppContext";
import { isTauriRuntime } from "@/lib/tauri-cli";

export function AppShell() {
  const { diagnostics, diagnosticsOpen, closeDiagnostics, cliOutputOpen } = useApp();
  usePageTitle();

  return (
    <TooltipProvider>
      <SidebarProvider
        className="sidebar-layout-root flex h-svh flex-col overflow-hidden"
        data-cli-output-open={cliOutputOpen ? "true" : undefined}
        data-tauri={isTauriRuntime() || undefined}
      >
        <div className="flex min-h-0 flex-1 w-full overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TitleBar />
            <div className="min-h-0 flex-1 overflow-hidden">
              <Outlet />
            </div>
          </SidebarInset>
        </div>

        <StatusBar />

        <DiagnosticsPanel
          open={diagnosticsOpen}
          diagnostics={diagnostics}
          onClose={closeDiagnostics}
        />

        <Toaster richColors closeButton />
      </SidebarProvider>
    </TooltipProvider>
  );
}
