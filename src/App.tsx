import { RouterProvider } from "react-router-dom";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";
import { AssetOnboardingHost } from "@/components/onboarding/AssetOnboardingHost";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import { LanguagePersistence } from "@/components/i18n/LanguagePersistence";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { AppUpdateProvider } from "@/contexts/AppUpdateContext";
import { AssetCatalogProvider } from "@/contexts/AssetCatalogContext";
import { router } from "@/routes";

function AppShell() {
  const { runtimeInfo } = useApp();
  return (
    <AssetCatalogProvider runtimeInfo={runtimeInfo}>
      <AppUpdateProvider>
        <AssetOnboardingHost />
        <AppErrorBoundary>
          <RouterProvider router={router} />
        </AppErrorBoundary>
      </AppUpdateProvider>
    </AssetCatalogProvider>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppThemeProvider>
        <LanguagePersistence />
        <AppShell />
      </AppThemeProvider>
    </AppProvider>
  );
}
