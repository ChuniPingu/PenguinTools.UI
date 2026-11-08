import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { openCliConnection } from "@/lib/cli-connection";
import { runCli, subscribeCliEvents } from "@/lib/tauri-cli";

vi.mock("@/lib/tauri-cli", () => ({ runCli: vi.fn(), subscribeCliEvents: vi.fn() }));

describe("CLI connection", () => {
  beforeEach(() => vi.resetAllMocks());

  function pendingConnection() {
    let resolve!: (stop: () => void) => void;
    vi.mocked(subscribeCliEvents).mockReturnValue(
      new Promise((complete) => {
        resolve = complete;
      }),
    );
    const onLine = vi.fn();
    const connection = openCliConnection({ onLine, onFinished: vi.fn() });
    return { connection, onLine, resolve };
  }

  it("subscribes before launching even when run is called immediately", async () => {
    const { connection, resolve } = pendingConnection();
    const running = connection.run(["info"]);
    await Promise.resolve();
    expect(runCli).not.toHaveBeenCalled();
    const stop = vi.fn();
    resolve(stop);
    await running;
    expect(runCli).toHaveBeenCalledExactlyOnceWith(["info"]);
    connection.dispose();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("cleans up delayed subscriptions and abandons launches after disposal", async () => {
    const { connection, onLine, resolve } = pendingConnection();
    const running = connection.run(["info"]);
    connection.dispose();
    const stop = vi.fn();
    resolve(stop);
    await running;
    expect(runCli).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledOnce();
    vi.mocked(subscribeCliEvents).mock.calls[0][0].onLine("late event");
    expect(onLine).not.toHaveBeenCalled();
  });

  it("propagates subscription failures without launching a process", async () => {
    const error = new Error("Cannot subscribe");
    vi.mocked(subscribeCliEvents).mockRejectedValue(error);
    const connection = openCliConnection({ onLine: vi.fn(), onFinished: vi.fn() });
    await expect(connection.run(["info"])).rejects.toBe(error);
    expect(runCli).not.toHaveBeenCalled();
    connection.dispose();
  });
});
