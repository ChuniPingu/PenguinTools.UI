import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { invoke } from "@tauri-apps/api/core";
import { startCliQuery, startCliTask, waitForCliTasks, type CliQuery } from "./cli-task";
import { appendCliLine } from "@/stores/cli-output-store";
import { useCliActivityStore } from "@/stores/cli-activity-store";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: class {
    onmessage = (_event: unknown) => {};
  },
}));

vi.mock("@/stores/cli-output-store", () => ({ appendCliLine: vi.fn() }));

function events(index = 0) {
  return (
    vi.mocked(invoke).mock.calls[index][1] as { events: { onmessage: (event: unknown) => void } }
  ).events;
}
const result = {
  type: "result",
  operation: "option.scan",
  success: false,
  data: { isPartial: true },
};

describe("independent CLI query bridge", () => {
  beforeEach(() => vi.resetAllMocks());

  it("does not report success when a process fails after emitting a success result", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const task = startCliTask("chart", ["chart", "convert", "in", "out"], vi.fn());
    expect(appendCliLine).toHaveBeenCalledExactlyOnceWith(
      "[chart] > PenguinTools.CLI chart convert in out",
    );
    events().onmessage({
      type: "output",
      line: JSON.stringify({
        ...result,
        operation: "chart.convert",
        success: true,
        message: { key: "fixture.success" },
      }),
    });
    expect(useCliActivityStore.getState().activity?.status).toBe("running");
    events().onmessage({ type: "finished", exitCode: 9 });
    await expect(task.promise).resolves.toMatchObject({
      success: false,
      exitCode: 9,
      message: undefined,
    });
    expect(useCliActivityStore.getState().activity).toMatchObject({
      operation: "chart.convert",
      status: "error",
      message: null,
    });
  });

  it.each([
    {
      page: "chart",
      query: { kind: "chartInspect", path: "C:/chart.ugc" },
      command: "chart inspect C:/chart.ugc",
    },
    {
      page: "option",
      query: { kind: "optionScan", path: "C:/option" },
      command: "option scan C:/option",
    },
    {
      page: "option",
      query: {
        kind: "optionScan",
        path: "C:/option",
        chartFileDiscovery: "ugc,mgxc",
        batchSize: 32,
      },
      command: "option scan C:/option --chart-file-discovery ugc,mgxc --batch-size 32",
    },
  ] satisfies { page: string; query: CliQuery; command: string }[])(
    "logs $command before query output with its page prefix",
    async ({ page, query, command }) => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const task = startCliQuery(query, vi.fn(), page);
      expect(appendCliLine).toHaveBeenCalledExactlyOnceWith(
        `[${page}] > PenguinTools.CLI ${command}`,
      );
      expect(invoke).toHaveBeenCalledWith(
        "start_cli_query",
        expect.objectContaining({ page, query }),
      );
      events().onmessage({ type: "output", line: "query output" });
      expect(appendCliLine).toHaveBeenNthCalledWith(2, `[${page}] query output`);
      events().onmessage({ type: "finished", exitCode: 130 });
      await expect(task.promise).resolves.toBeNull();
    },
  );

  it("isolates progress and retains partial results until native completion", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const progress = vi.fn();
    const scan = startCliQuery({ kind: "optionScan", path: "C:/option" }, progress);
    const inspect = startCliQuery({ kind: "chartInspect", path: "C:/chart.ugc" }, vi.fn());
    const settled = vi.fn();
    void scan.promise.then(settled);
    const line = { type: "progress", operation: "option.scan", completed: 1, total: 2 };
    events().onmessage({ type: "output", line: JSON.stringify(line) });
    expect(progress).toHaveBeenCalledExactlyOnceWith(line);
    events().onmessage({ type: "output", line: JSON.stringify(result) });
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    events().onmessage({ type: "finished", exitCode: 1 });
    await expect(scan.promise).resolves.toEqual({ ...result, exitCode: 1 });
    const idle = vi.fn();
    const waiting = waitForCliTasks().then(idle);
    await Promise.resolve();
    expect(idle).not.toHaveBeenCalled();
    events(1).onmessage({ type: "finished", exitCode: 130 });
    await expect(inspect.promise).resolves.toBeNull();
    await waiting;
  });

  it("cancels the correct query after its delayed launch acknowledgement", async () => {
    let launched!: () => void;
    vi.mocked(invoke).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        launched = resolve;
      }),
    );
    const query = startCliQuery({ kind: "chartInspect", path: "C:/chart.ugc" }, vi.fn());
    const id = (vi.mocked(invoke).mock.calls[0][1] as { id: string }).id;
    const cancelling = query.cancel();
    await Promise.resolve();
    expect(invoke).toHaveBeenCalledOnce();
    launched();
    await cancelling;
    expect(invoke).toHaveBeenLastCalledWith("cancel_cli_task", { id });
    events().onmessage({ type: "finished", exitCode: 130 });
    await expect(query.promise).resolves.toBeNull();
  });

  it("rejects launch failures and releases update waiters", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("Cannot start query"));
    const query = startCliQuery({ kind: "chartInspect", path: "missing" }, vi.fn());
    await expect(query.promise).rejects.toThrow("Cannot start query");
    await waitForCliTasks();
    expect(useCliActivityStore.getState()).toMatchObject({
      activeCount: 0,
      activity: { status: "error", output: "Cannot start query" },
    });
  });

  it.each([0, 124])(
    "rejects missing output or timeout (%s) and ignores late events",
    async (exitCode) => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      const progress = vi.fn();
      const query = startCliQuery({ kind: "optionScan", path: "C:/option" }, progress);
      events().onmessage({ type: "output", line: "invalid JSON" });
      events().onmessage({
        type: "output",
        line: JSON.stringify({ ...result, operation: "chart.inspect" }),
      });
      events().onmessage({ type: "finished", exitCode });
      await expect(query.promise).rejects.toMatchObject({ exitCode });
      events().onmessage({
        type: "output",
        line: JSON.stringify({ type: "progress", operation: "option.scan" }),
      });
      expect(progress).not.toHaveBeenCalled();
      await query.cancel();
      expect(invoke).toHaveBeenCalledOnce();
    },
  );
});
