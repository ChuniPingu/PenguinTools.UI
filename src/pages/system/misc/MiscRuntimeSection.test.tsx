import { describe, expect, it, vi } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import { MiscRuntimeSection } from "./MiscRuntimeSection";
import type { RuntimeInfo } from "@/lib/tauri-cli";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

const info: RuntimeInfo = {
  version: "2.5.0",
  buildDateUtc: "unknown",
  root: "C:/runtime",
  cliExe: "C:/runtime/PenguinTools.CLI.exe",
  assetsDir: "C:/runtime/assets",
  userDataDir: "C:/user-data",
  tempDir: "C:/temp",
  extracted: false,
};

describe("CLI metadata status", () => {
  it.each([false, true])("shows a settled failure instead of loading (failed=%s)", (failed) => {
    const markup = renderToStaticMarkup(
      <MiscRuntimeSection
        info={info}
        cliInfo={null}
        cliInfoLoadFailed={failed}
        isBrowserPreview={false}
        runtimeLoadFailed={false}
        refreshDisabled={false}
        onRefresh={() => {}}
        onOpenDirectory={() => {}}
      />,
    );
    expect(markup).toContain(failed ? "ui.misc.runtime.cliUnavailable" : "ui.common.loading");
    expect(markup).not.toContain(failed ? "ui.common.loading" : "ui.misc.runtime.cliUnavailable");
    expect(markup).toContain("ui.misc.actions.refresh");
    expect(markup).not.toMatch(/\s(?:disabled|aria-disabled)=/);
  });
});
