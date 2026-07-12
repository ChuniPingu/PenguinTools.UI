import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorPageLayout } from "@/components/errors/ErrorPageLayout";
import { ErrorReloadButton } from "@/components/errors/ErrorReloadButton";
import { t } from "@/i18n";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled application error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;

    if (error) {
      return (
        <div className="flex h-svh flex-col overflow-hidden bg-background">
          <ErrorPageLayout
            title={t("ui.errors.generic.title")}
            description={error.message || t("ui.errors.generic.appDescription")}
            details={import.meta.env.DEV ? error.stack : undefined}
            actions={<ErrorReloadButton />}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
