import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createCliActivityStore } from "./cli-activity-store";

describe("CLI status bar activity", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("coalesces a burst into the latest output without delaying completion", () => {
    const store = createCliActivityStore();
    const { start, update, finish } = store.getState();
    start("scan", "option.scan");
    const changed = vi.fn();
    store.subscribe(changed);
    for (let i = 0; i < 100; i++) update("scan", { output: `file ${i}` });
    expect(changed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(180);
    expect(changed).toHaveBeenCalledOnce();
    expect(store.getState().activity?.output).toBe("file 99");
    update("scan", { output: "final file" });
    finish("scan", "success");
    expect(store.getState()).toMatchObject({
      activeCount: 0,
      activity: { status: "success", output: "final file" },
    });
    vi.runAllTimers();
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it("keeps the newest running task in focus and returns to an older active task", () => {
    const store = createCliActivityStore();
    const { start, update, finish } = store.getState();
    start("scan", "option.scan");
    start("convert", "chart.convert");
    update("scan", { output: "background output" });
    vi.advanceTimersByTime(180);
    expect(store.getState()).toMatchObject({ activeCount: 2, activity: { id: "convert" } });
    finish("convert", "success");
    expect(store.getState()).toMatchObject({
      activeCount: 1,
      activity: { id: "scan", output: "background output" },
    });
    finish("scan", "cancelled");
    update("scan", { output: "late event" });
    vi.runAllTimers();
    expect(store.getState()).toMatchObject({
      activeCount: 0,
      activity: { status: "cancelled", output: "background output" },
    });
  });
});
