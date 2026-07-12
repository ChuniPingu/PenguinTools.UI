import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, lazyPlugins, type Plugin } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.TAURI_DEV_HOST;

function i18nHmrPlugin(): Plugin {
  return {
    name: "i18n-hmr",
    handleHotUpdate({ file, server }) {
      if (file.endsWith(".json") && file.includes("locales")) {
        server.ws.send({
          type: "custom",
          event: "i18n-update",
          data: {
            file,
            content: readFileSync(file, "utf-8"),
          },
        });

        return [];
      }
    },
  };
}

export default defineConfig({
  staged: {
    "*.{js,ts,tsx}": "vp check --fix",
  },
  lint: {
    ignorePatterns: [
      "dist/**",
      "src-tauri/**",
      "external/**",
      "node_modules/**",
      "src/components/ui/**",
    ],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: [
      "dist/**",
      "src-tauri/**",
      "external/**",
      "node_modules/**",
      "src/components/ui/**",
    ],
    sortPackageJson: true,
  },
  plugins: lazyPlugins(() => [react(), tailwindcss(), i18nHmrPlugin()]),
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 5173,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
});
