import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import { ToolPageShell } from "./ToolPageShell";
import type { usePageTask } from "@/hooks/use-page-task";

const app = vi.hoisted(() => ({
  actionsBusy: true,
  cliActionsBlocked: false,
}));
vi.mock("@/contexts/AppContext", () => ({ useApp: () => app }));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderQuery(
  status: ReturnType<typeof usePageTask>["state"]["status"] = "idle",
  details: Partial<ReturnType<typeof usePageTask>["state"]> = {},
) {
  const query: ReturnType<typeof usePageTask> = {
    page: "option",
    state: {
      status,
      operation: "option.scan",
      progress: null,
      diagnostics: [],
      result: null,
      error: status === "error" ? "Retry inspection" : "",
      ...details,
    },
    run: vi.fn(),
    runCommand: vi.fn(),
    setSource: vi.fn(),
    hasAttempted: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
    busy: status === "running",
    blocked: app.cliActionsBlocked,
  };
  return renderToStaticMarkup(
    <ToolPageShell task={query} onReload={() => {}} onPrimary={() => {}}>
      Content
    </ToolPageShell>,
  );
}
function button(markup: string, label: string) {
  const found = [...markup.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].find(([html]) =>
    html.includes(label),
  );
  expect(found).toBeDefined();
  return found![0];
}

describe("independent inspection actions", () => {
  beforeEach(() => {
    app.actionsBusy = true;
    app.cliActionsBlocked = false;
  });
  it("shows only the completion label even when the CLI returns a message and diagnostics", () => {
    const markup = renderQuery("success", {
      result: {
        type: "result",
        schemaVersion: 4,
        operation: "stage.build-files",
        success: true,
        exitCode: 0,
        message: { key: "cli.msg.built_stage", args: { arg0: "C:/exported-stage" } },
        diagnostics: [],
      },
      diagnostics: [{ severity: "Information", message: { key: "fixture.diagnostic" } }],
    });
    expect(markup).toContain("ui.tasks.completedStatus");
    expect(markup).not.toContain("exported-stage");
    expect(markup).not.toContain("ui.query.diagnostics");
    const status = markup.match(/<div\b[^>]*role="status"[^>]*>[\s\S]*?<\/div>/)?.[0];
    expect(status).toContain("ui.tasks.completedStatus");
    expect(status).not.toContain("<button");
    expect(button(markup, "ui.diagnostics.title")).not.toMatch(/\sdisabled=/);
    expect(markup.indexOf(button(markup, "ui.diagnostics.title"))).toBeLessThan(
      markup.indexOf(button(markup, "ui.common.actions.reload")),
    );
    expect(markup.indexOf(button(markup, "ui.common.actions.reload"))).toBeLessThan(
      markup.indexOf(button(markup, "ui.common.actions.convert")),
    );
    expect(markup.match(/<button\b/g)).toHaveLength(3);
  });
  it("disables diagnostics until this page has a result to inspect", () => {
    expect(button(renderQuery(), "ui.diagnostics.title")).toMatch(/\sdisabled=/);
  });
  it("keeps local diagnostics readable while starting CLI work is blocked", () => {
    app.cliActionsBlocked = true;
    const markup = renderQuery("error", {
      diagnostics: [{ severity: "Error", message: { key: "fixture.diagnostic" } }],
    });
    expect(button(markup, "ui.diagnostics.title")).not.toMatch(/\sdisabled=/);
    expect(button(markup, "ui.common.actions.convert")).toMatch(/\sdisabled=/);
  });
  it("allows this page's reload and writes alongside another page's job", () => {
    const markup = renderQuery();
    expect(button(markup, "ui.common.actions.reload")).not.toMatch(/\sdisabled=/);
    expect(button(markup, "ui.common.actions.convert")).not.toMatch(/\sdisabled=/);
  });
  it("shows local cancellation and prevents duplicate reloads during a query", () => {
    const markup = renderQuery("running");
    expect(button(markup, "ui.common.actions.cancel")).not.toMatch(/\sdisabled=/);
    expect(button(markup, "ui.common.actions.reload")).toMatch(/\sdisabled=/);
  });
  it("allows retry after failure even while another task is running", () => {
    const markup = renderQuery("error");
    expect(markup).toContain("ui.tasks.failed");
    expect(markup).not.toContain("Retry inspection");
    expect(button(markup, "ui.common.actions.reload")).not.toMatch(/\sdisabled=/);
  });
  it("keeps long error paths out of the status text and tooltip", () => {
    const path = `C:/${"long-output-directory/".repeat(30)}out.png`;
    const markup = renderQuery("error", { error: `Output in use: ${path}` });
    expect(markup).toContain("ui.tasks.failed");
    expect(markup).not.toContain("Output in use");
    expect(markup).not.toContain(path);
  });
  it("shows concise running progress without filenames, item labels, or cancellation errors", () => {
    const markup = renderQuery("running", {
      progress: {
        type: "progress",
        operation: "option.scan",
        completed: 2,
        total: 10,
        item: "C:/long-option-path/song/chart.ugc",
        label: "Long song and chart details",
      },
      error: "Detailed cancellation failure",
    });
    expect(markup).toContain("ui.progress.working 2/10");
    expect(markup).not.toContain("long-option-path");
    expect(markup).not.toContain("Long song and chart details");
    expect(markup).not.toContain("Detailed cancellation failure");
  });
  it("blocks new queries during updates", () => {
    app.cliActionsBlocked = true;
    expect(button(renderQuery(), "ui.common.actions.reload")).toMatch(/\sdisabled=/);
  });
});
