import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import "./index.css";
import { App } from "@/App";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";
import { StartupWindow } from "@/components/layout/StartupWindow";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
    <StartupWindow />
  </React.StrictMode>,
);
