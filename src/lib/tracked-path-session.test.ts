import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { openTrackedPathSession } from "@/lib/tracked-path-session";
import {
  startTrackedPathWatch,
  stopTrackedPathWatch,
  subscribeTrackedPathChanged,
} from "@/lib/tauri-cli";

vi.mock("@/lib/tauri-cli", () => ({
  startTrackedPathWatch: vi.fn(),
  stopTrackedPathWatch: vi.fn(),
  subscribeTrackedPathChanged: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("tracked path sessions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(startTrackedPathWatch).mockResolvedValue(undefined);
    vi.mocked(stopTrackedPathWatch).mockResolvedValue(undefined);
    vi.mocked(subscribeTrackedPathChanged).mockResolvedValue(vi.fn());
  });

  it("releases a listener that arrives after disposal without starting a watcher", async () => {
    const listener = deferred<() => void>();
    vi.mocked(subscribeTrackedPathChanged).mockReturnValue(listener.promise);
    const onChanged = vi.fn();
    const session = openTrackedPathSession("a", ["a"], onChanged);
    await vi.waitFor(() => expect(subscribeTrackedPathChanged).toHaveBeenCalledOnce());
    const disposed = session.dispose();
    const unlisten = vi.fn();
    listener.resolve(unlisten);
    await disposed;
    await session.ready;
    vi.mocked(subscribeTrackedPathChanged).mock.calls[0][0]("a");
    expect(onChanged).not.toHaveBeenCalled();
    expect(unlisten).toHaveBeenCalledOnce();
    expect(startTrackedPathWatch).not.toHaveBeenCalled();
  });

  it("finishes an old start and stop before starting its replacement", async () => {
    const starting = deferred<void>();
    const order: string[] = [];
    vi.mocked(startTrackedPathWatch).mockImplementation(async (path) => {
      order.push(`start ${path}`);
      if (path === "a") await starting.promise;
    });
    vi.mocked(stopTrackedPathWatch).mockImplementation(async () => {
      order.push("stop");
    });
    const first = openTrackedPathSession("a", ["a"], vi.fn());
    await vi.waitFor(() => expect(startTrackedPathWatch).toHaveBeenCalledOnce());
    const disposed = first.dispose();
    const second = openTrackedPathSession("b", ["b"], vi.fn());
    starting.resolve();
    await disposed;
    await second.ready;
    expect(order).toEqual(["start a", "stop", "start b"]);
    await second.dispose();
  });

  it("cleans up and reports failed setup without blocking subsequent sessions", async () => {
    const unlisten = vi.fn();
    const error = new Error("Watch failed");
    vi.mocked(subscribeTrackedPathChanged).mockResolvedValueOnce(unlisten);
    vi.mocked(startTrackedPathWatch).mockRejectedValueOnce(error);
    const first = openTrackedPathSession("a", ["a"], vi.fn());
    await expect(first.ready).rejects.toBe(error);
    expect(unlisten).toHaveBeenCalledOnce();
    await first.dispose();
    const second = openTrackedPathSession("b", ["b"], vi.fn());
    await second.ready;
    expect(startTrackedPathWatch).toHaveBeenLastCalledWith("b", ["b"]);
    await second.dispose();
  });
});
