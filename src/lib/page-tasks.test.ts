import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { invoke } from "@tauri-apps/api/core";
import i18n from "@/i18n";
import {
  getPageTask,
  getActivePageTasks,
  assetsAreBusy,
  pageTaskRoutes,
  setPageTasksBlocked,
  subscribeTaskResults,
  subscribePageTaskResults,
  subscribeTaskErrors,
  type TaskPage,
} from "./page-tasks";
import { waitForCliTasks } from "./cli-task";
import { useCliInfoStore } from "@/stores/cli-info-store";
import type { CliDiagnosticPayload, CliResponse } from "./cli-types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: class {
    onmessage = (_event: unknown) => {};
  },
}));
vi.mock("./tauri-cli", async (original) => ({
  ...(await original<typeof import("./tauri-cli")>()),
  isTauriRuntime: () => true,
}));

const result: CliResponse = {
  type: "result",
  schemaVersion: 4,
  operation: "chart.inspect",
  success: true,
  exitCode: 0,
  diagnostics: [],
};
function launches() {
  return vi
    .mocked(invoke)
    .mock.calls.filter(([name]) => name === "start_cli_query" || name === "start_cli_task")
    .map(
      ([, args]) =>
        args as { id: string; page: string; events: { onmessage: (event: unknown) => void } },
    );
}
function output(index: number, payload: unknown) {
  launches()[index].events.onmessage({ type: "output", line: JSON.stringify(payload) });
}
function finish(index: number, response: CliResponse | null = result, exitCode = 0) {
  if (response) output(index, response);
  launches()[index].events.onmessage({ type: "finished", exitCode });
}
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

describe("persistent page tasks", () => {
  const unsubscribeResults: Array<() => void> = [];
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(invoke).mockResolvedValue(undefined);
    setPageTasksBlocked(false);
    for (const page of Object.keys(pageTaskRoutes) as TaskPage[]) getPageTask(page).reset();
  });
  afterEach(async () => {
    for (const unsubscribe of unsubscribeResults.splice(0)) unsubscribe();
    for (const [, task] of getActivePageTasks()) task.cancel();
    for (const launch of launches()) launch.events.onmessage({ type: "finished", exitCode: 130 });
    await waitForCliTasks();
    setPageTasksBlocked(false);
    await i18n.changeLanguage("en");
  });

  it("reports background completion once, after native exit, without replaying on navigation", async () => {
    const task = getPageTask("stage");
    const completed = vi.fn();
    unsubscribeResults.push(subscribeTaskResults(completed));
    const leavePage = task.subscribe(vi.fn());
    const work = task.runCommand(["stage", "build-files", "in", "out"]);
    leavePage();
    const response = {
      ...result,
      operation: "stage.build-files",
      message: { key: "cli.msg.built_stage", args: { arg0: "out" } },
    };
    output(0, response);
    expect(completed).not.toHaveBeenCalled();
    finish(0, response);
    await work;
    expect(completed).toHaveBeenCalledExactlyOnceWith({ page: "stage", response, diagnostics: [] });
    const returnToPage = getPageTask("stage").subscribe(vi.fn());
    finish(0, response);
    returnToPage();
    expect(completed).toHaveBeenCalledOnce();
  });

  it.each(["en", "zh-Hans"])(
    "reports a long output conflict once in %s and permits retry without disturbing other pages",
    async (language) => {
      await i18n.changeLanguage(language);
      const message = i18n.t("ui.tasks.notify.outputConflict");
      const other = getPageTask("audio");
      const otherWork = other.runCommand(["audio", "extract", "in", "out"]);
      const task = getPageTask("stage");
      const errorNotice = vi.fn();
      unsubscribeResults.push(subscribeTaskErrors(errorNotice));
      const path = `C:/${"long-output-directory/".repeat(30)}out.png`;
      vi.mocked(invoke).mockRejectedValueOnce({ code: "outputConflict", path });
      await expect(task.runCommand(["stage", "build-files", "in", path])).resolves.toBeNull();
      expect(message).not.toContain(path);
      expect(message).not.toMatch(/[{}]/);
      expect(errorNotice).toHaveBeenCalledExactlyOnceWith({ page: "stage", message });
      expect(task.getSnapshot()).toMatchObject({ status: "error", error: message });
      expect(other.getSnapshot().status).toBe("running");
      const returnToPage = getPageTask("stage").subscribe(vi.fn());
      returnToPage();
      expect(errorNotice).toHaveBeenCalledOnce();
      const retry = task.runCommand(["stage", "build-files", "in", "different-output"]);
      finish(2, { ...result, operation: "stage.build-files" });
      await retry;
      expect(task.getSnapshot()).toMatchObject({ status: "success", error: "" });
      expect(errorNotice).toHaveBeenCalledOnce();
      finish(0, { ...result, operation: "audio.extract" });
      await otherWork;
    },
  );

  it("does not notify about a launch error arriving after cancellation", async () => {
    let rejectLaunch!: (error: unknown) => void;
    vi.mocked(invoke).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectLaunch = reject;
        }),
    );
    const errorNotice = vi.fn();
    unsubscribeResults.push(subscribeTaskErrors(errorNotice));
    const task = getPageTask("stage");
    const work = task.runCommand(["stage", "build-files", "in", "out"]);
    task.cancel();
    rejectLaunch({ code: "outputConflict", path: "out" });
    await work;
    await flush();
    expect(errorNotice).not.toHaveBeenCalled();
    expect(task.getSnapshot().status).toBe("cancelled");
  });

  it("does not present a cancelled task's late success result", async () => {
    const task = getPageTask("stage"),
      completed = vi.fn();
    unsubscribeResults.push(subscribeTaskResults(completed));
    const work = task.runCommand(["stage", "build-files", "in", "out"]);
    task.cancel();
    finish(0, { ...result, operation: "stage.build-files" });
    await work;
    expect(completed).not.toHaveBeenCalled();
  });

  it("delivers concurrent success and failure diagnostics only to their own pages", async () => {
    const chart = getPageTask("chart"),
      audio = getPageTask("audio");
    const chartCompleted = vi.fn(),
      audioCompleted = vi.fn();
    unsubscribeResults.push(
      subscribePageTaskResults("chart", chartCompleted),
      subscribePageTaskResults("audio", audioCompleted),
    );
    const first = chart.runCommand(["chart", "convert", "in", "chart-out"]);
    const second = audio.runCommand(["audio", "extract", "in", "audio-out"]);
    const chartNote: CliDiagnosticPayload = {
      severity: "Warning",
      message: { key: "fixture.chart" },
    };
    const audioError: CliDiagnosticPayload = {
      severity: "Error",
      message: { key: "fixture.audio" },
    };
    finish(0, { ...result, operation: "chart.convert", diagnostics: [chartNote] });
    await first;
    expect(chartCompleted).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ page: "chart", diagnostics: [chartNote] }),
    );
    expect(audioCompleted).not.toHaveBeenCalled();
    finish(
      1,
      {
        ...result,
        operation: "audio.extract",
        success: false,
        exitCode: 1,
        diagnostics: [audioError],
      },
      1,
    );
    await second;
    expect(audioCompleted).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ page: "audio", diagnostics: [audioError] }),
    );
    expect(chartCompleted).toHaveBeenCalledOnce();
    expect(chart.getSnapshot().diagnostics).toEqual([chartNote]);
    expect(audio.getSnapshot().diagnostics).toEqual([audioError]);
  });

  it("retains background diagnostics without replaying their completion when the page returns", async () => {
    const task = getPageTask("stage"),
      completed = vi.fn();
    const leavePage = subscribePageTaskResults("stage", completed);
    unsubscribeResults.push(leavePage);
    const work = task.runCommand(["stage", "build-files", "in", "out"]);
    leavePage();
    const diagnostic: CliDiagnosticPayload = {
      severity: "Warning",
      message: { key: "fixture.background" },
    };
    finish(0, { ...result, operation: "stage.build-files", diagnostics: [diagnostic] });
    await work;
    unsubscribeResults.push(subscribePageTaskResults("stage", completed));
    expect(completed).not.toHaveBeenCalled();
    expect(getPageTask("stage").getSnapshot().diagnostics).toEqual([diagnostic]);
    const retry = task.runCommand(["stage", "build-files", "in", "out"]);
    finish(1, { ...result, operation: "stage.build-files", diagnostics: [] });
    await retry;
    expect(completed).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ diagnostics: [] }));
    expect(task.getSnapshot().diagnostics).toEqual([]);
  });

  it("runs writes on separate pages and retains state after the last subscriber leaves", async () => {
    const chart = getPageTask("chart"),
      audio = getPageTask("audio");
    const unsubscribe = chart.subscribe(vi.fn());
    const applied = vi.fn();
    const first = chart.runCommand(["chart", "convert", "in", "out"], applied);
    const second = audio.runCommand(["audio", "extract", "in", "other"]);
    expect(launches().map((item) => item.page)).toEqual(["chart", "audio"]);
    unsubscribe();
    output(0, { type: "progress", operation: "chart.convert", completed: 2, total: 3 });
    expect(chart.getSnapshot().progress?.completed).toBe(2);
    expect(audio.getSnapshot().progress).toBeNull();
    output(0, { ...result, operation: "chart.convert" });
    expect(applied).not.toHaveBeenCalled();
    finish(0, { ...result, operation: "chart.convert" });
    await first;
    expect(applied).toHaveBeenCalledOnce();
    expect(getPageTask("chart").getSnapshot()).toMatchObject({
      status: "success",
      result: { operation: "chart.convert" },
    });
    expect(audio.getSnapshot().status).toBe("running");
    finish(1, { ...result, operation: "audio.extract" });
    await second;
  });

  it("refuses a second write on the same page and keeps an export alive when its input changes", async () => {
    const task = getPageTask("song");
    const work = task.runCommand(["music", "build", "in", "out"]);
    await expect(task.runCommand(["music", "build", "in", "out2"])).resolves.toBeNull();
    task.setSource("another-chart.ugc");
    expect(launches()).toHaveLength(1);
    expect(task.getSnapshot().status).toBe("running");
    expect(invoke).not.toHaveBeenCalledWith("cancel_cli_task", expect.anything());
    finish(0, { ...result, operation: "music.build" });
    await work;
  });

  it("returning to an inspected source preserves progress, results and the attempt marker", async () => {
    const task = getPageTask("extractChart");
    task.setSource("chart.ugc");
    const applied = vi.fn();
    const work = task.run({ kind: "chartInspect", path: "chart.ugc" }, applied);
    const unsubscribe = task.subscribe(vi.fn());
    unsubscribe();
    const running = task.getSnapshot();
    getPageTask("extractChart").setSource("chart.ugc");
    expect(task.getSnapshot()).toBe(running);
    finish(0);
    await work;
    task.setSource("chart.ugc");
    expect(task.hasAttempted("chart.ugc")).toBe(true);
    expect(task.getSnapshot().status).toBe("success");
    expect(applied).toHaveBeenCalledOnce();
    expect(launches()).toHaveLength(1);
  });

  it("waits for a superseded query to stop before launching its replacement", async () => {
    const task = getPageTask("jacket"),
      oldResult = vi.fn(),
      newResult = vi.fn();
    const first = task.run({ kind: "chartInspect", path: "old.ugc" }, oldResult);
    const second = task.run({ kind: "chartInspect", path: "new.ugc" }, newResult);
    expect(task.getSnapshot().status).toBe("waiting");
    expect(launches()).toHaveLength(1);
    finish(0); // A result racing with cancellation must not be applied.
    await first;
    await flush();
    expect(oldResult).not.toHaveBeenCalled();
    expect(launches()).toHaveLength(2);
    finish(1);
    await second;
    expect(newResult).toHaveBeenCalledOnce();
  });

  it("keeps cancellation busy until native termination and suppresses late results", async () => {
    const task = getPageTask("stage"),
      applied = vi.fn();
    const work = task.runCommand(["stage", "build-files", "in", "out"], applied);
    task.cancel();
    expect(task.getSnapshot().status).toBe("cancelling");
    await expect(task.runCommand(["stage", "build-files", "in", "out2"])).resolves.toBeNull();
    finish(0);
    await work;
    expect(applied).not.toHaveBeenCalled();
    expect(task.getSnapshot().status).toBe("cancelled");
  });

  it("clears loading after a timeout and permits retry", async () => {
    const task = getPageTask("option");
    const first = task.run({ kind: "optionScan", path: "option" });
    finish(0, null, 124);
    await first;
    expect(task.getSnapshot().status).toBe("error");
    expect(task.getSnapshot().error).not.toBe("");
    const retry = task.run({ kind: "optionScan", path: "option" });
    finish(1, { ...result, operation: "option.scan" });
    await retry;
    expect(task.getSnapshot()).toMatchObject({ status: "success", error: "" });
  });

  it("retains partial scan data and diagnostics after failure", async () => {
    const task = getPageTask("option"),
      applied = vi.fn();
    const work = task.run({ kind: "optionScan", path: "partial" }, applied);
    const partial: CliResponse = {
      ...result,
      operation: "option.scan",
      success: false,
      exitCode: 1,
      data: { books: [], isPartial: true },
      diagnostics: [{ severity: "Warning", message: { key: "fixture.partial" } }],
    };
    finish(0, partial, 1);
    await work;
    expect(applied).toHaveBeenCalledWith(partial);
    expect(task.getSnapshot()).toMatchObject({
      status: "error",
      result: partial,
      diagnostics: partial.diagnostics,
    });
  });

  it("reserves assets while waiting, permits CLI checks, and resumes other pages after collection", async () => {
    const reader = getPageTask("chart"),
      collector = getPageTask("misc");
    const read = reader.run({ kind: "chartInspect", path: "in" });
    const collection = collector.runCommand([
      "assets",
      "collect",
      "game",
      "--output",
      "assets.user.json",
    ]);
    expect(collector.getSnapshot().status).toBe("waiting");
    expect(assetsAreBusy()).toBe(true);
    await expect(
      getPageTask("audio").runCommand(["audio", "extract", "in", "out"]),
    ).resolves.toBeNull();
    const info = {
      applicationName: "CLI",
      version: "1",
      buildDateUtc: "today",
      baseDirectory: "base",
      tempWorkPath: "temp",
      infrastructureAssetsPath: "assets",
    };
    vi.mocked(invoke).mockResolvedValueOnce(
      JSON.stringify({ ...result, operation: "info", data: info }),
    );
    await useCliInfoStore.getState().refresh();
    expect(useCliInfoStore.getState()).toMatchObject({ status: "success", info });
    finish(0);
    await read;
    await flush();
    expect(launches()).toHaveLength(2);
    expect(collector.getSnapshot().status).toBe("running");
    await expect(reader.run({ kind: "chartInspect", path: "other" })).resolves.toBeNull();
    finish(1, { ...result, operation: "assets.collect" });
    await collection;
    expect(assetsAreBusy()).toBe(false);
    const next = reader.run({ kind: "chartInspect", path: "other" });
    finish(2);
    await next;
  });

  it("cancelling a waiting collector releases the assets gate without starting it", async () => {
    const reader = getPageTask("audio"),
      collector = getPageTask("misc");
    const read = reader.runCommand(["audio", "extract", "in", "out"]);
    const collection = collector.runCommand([
      "assets",
      "collect",
      "game",
      "--output",
      "assets.user.json",
    ]);
    collector.cancel();
    await collection;
    expect(assetsAreBusy()).toBe(false);
    expect(reader.getSnapshot().status).toBe("running");
    expect(launches()).toHaveLength(1);
    finish(0);
    await read;
  });

  it("collection launch failure releases the assets gate", async () => {
    vi.mocked(invoke).mockRejectedValueOnce({ code: "failed", message: "Failed to launch" });
    await getPageTask("misc").runCommand([
      "assets",
      "collect",
      "game",
      "--output",
      "assets.user.json",
    ]);
    expect(assetsAreBusy()).toBe(false);
    expect(getPageTask("misc").getSnapshot()).toMatchObject({
      status: "error",
      error: "Failed to launch",
    });
  });

  it("updates block new jobs and wait for all running pages", async () => {
    const first = getPageTask("chart").runCommand(["chart", "convert", "in", "out"]);
    const second = getPageTask("audio").runCommand(["audio", "extract", "in", "out"]);
    setPageTasksBlocked(true);
    const ready = vi.fn();
    const idle = waitForCliTasks().then(ready);
    await expect(
      getPageTask("song").runCommand(["music", "build", "in", "out"]),
    ).resolves.toBeNull();
    finish(0);
    await first;
    expect(ready).not.toHaveBeenCalled();
    finish(1);
    await second;
    await idle;
    expect(ready).toHaveBeenCalledOnce();
  });
});
