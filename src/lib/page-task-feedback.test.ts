import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import i18n from "@/i18n";
import { presentTaskResult } from "./page-task-feedback";
import type { PageTaskResult } from "./page-tasks";
import type { CliDiagnosticPayload } from "./cli-types";

const diagnostic: CliDiagnosticPayload = {
  severity: "Information",
  message: { key: "fixture.note" },
  path: "C:/stage",
};
const result: PageTaskResult = {
  page: "stage",
  response: {
    type: "result",
    schemaVersion: 4,
    operation: "stage.build-files",
    success: true,
    exitCode: 0,
    message: { key: "cli.msg.built_stage", args: { arg0: "C:/stage" } },
    diagnostics: [diagnostic],
  },
  diagnostics: [diagnostic],
};

describe("task completion feedback", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it.each([{ diagnostics: [] }, { diagnostics: [diagnostic] }])(
    "leaves successful task feedback to the status bar with $diagnostics",
    ({ diagnostics }) => {
      const handlers = { notifyError: vi.fn() };
      presentTaskResult(
        { ...result, response: { ...result.response, diagnostics }, diagnostics },
        handlers,
      );
      expect(handlers.notifyError).not.toHaveBeenCalled();
    },
  );

  it("leaves failure details to the page's diagnostics when available", () => {
    const handlers = { notifyError: vi.fn() };
    presentTaskResult(
      { ...result, response: { ...result.response, success: false, exitCode: 1 } },
      handlers,
    );
    expect(handlers.notifyError).not.toHaveBeenCalled();
  });

  it("shows a CLI failure message in a toast when there are no diagnostics", () => {
    const handlers = { notifyError: vi.fn() };
    presentTaskResult(
      {
        ...result,
        diagnostics: [],
        response: {
          ...result.response,
          success: false,
          exitCode: 1,
          diagnostics: [],
          message: { key: "cli.msg.command_line_parsing_failed", args: { arg0: "--invalid" } },
        },
      },
      handlers,
    );
    expect(handlers.notifyError).toHaveBeenCalledExactlyOnceWith(
      "Cannot use these command-line options: --invalid",
    );
  });

  it("does not invent a success message when the CLI provides none", () => {
    const handlers = { notifyError: vi.fn() };
    presentTaskResult(
      { ...result, response: { ...result.response, message: null }, diagnostics: [] },
      handlers,
    );
    expect(handlers.notifyError).not.toHaveBeenCalled();
  });

  it("keeps CLI metadata checks silent", () => {
    const handlers = { notifyError: vi.fn() };
    presentTaskResult(
      { ...result, response: { ...result.response, operation: "info" }, diagnostics: [] },
      handlers,
    );
    expect(handlers.notifyError).not.toHaveBeenCalled();
  });
});
