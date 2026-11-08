import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  appendCliLine,
  MAX_OUTPUT_CHARACTERS,
  MAX_OUTPUT_LINES,
  useCliOutputStore,
} from "@/stores/cli-output-store";

describe("CLI output", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useCliOutputStore.getState().clear();
  });
  afterEach(() => {
    useCliOutputStore.getState().clear();
    vi.useRealTimers();
  });

  it("publishes a burst in order with one subscriber update", () => {
    const changed = vi.fn();
    const unsubscribe = useCliOutputStore.subscribe(changed);
    appendCliLine("first");
    appendCliLine("second");
    expect(changed).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(changed).toHaveBeenCalledOnce();
    expect(useCliOutputStore.getState().lines).toEqual(["first", "second"]);
    unsubscribe();
  });

  it("bounds retained output across multiple flushes", () => {
    for (let i = 0; i < MAX_OUTPUT_LINES; i++) appendCliLine(String(i));
    vi.runAllTimers();
    appendCliLine("last");
    vi.runAllTimers();
    const state = useCliOutputStore.getState();
    expect(state.lines).toHaveLength(MAX_OUTPUT_LINES);
    expect(state.lines[0]).toBe("1");
    expect(state.lines[state.lines.length - 1]).toBe("last");
    expect(state.truncated).toBe(true);
  });

  it("bounds oversized lines and clears unpublished output", () => {
    appendCliLine("x".repeat(MAX_OUTPUT_CHARACTERS + 1));
    vi.runAllTimers();
    expect(useCliOutputStore.getState().lines[0]).toHaveLength(MAX_OUTPUT_CHARACTERS);
    expect(useCliOutputStore.getState().truncated).toBe(true);
    appendCliLine("pending");
    useCliOutputStore.getState().clear();
    vi.runAllTimers();
    expect(useCliOutputStore.getState().lines).toEqual([]);
    expect(useCliOutputStore.getState().truncated).toBe(false);
  });
});
