import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCliInfo, runCli, subscribeCliEvents } from "@/lib/tauri-cli";

vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("getCliInfo", () => {
  const data = { version: "1.13.0", buildDateUtc: "2026-07-12T20:01:33+08:00" };
  const output = JSON.stringify({ type: "result", operation: "info", success: true, data });

  beforeEach(() => vi.resetAllMocks());

  it("returns metadata directly while a foreground command is running", async () => {
    let finish!: () => void;
    vi.mocked(invoke).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const foreground = runCli(["option", "scan", "C:\\option"]);
    vi.mocked(invoke).mockResolvedValueOnce(`startup log\r\nnull\r\n${output}\r\n`);

    await expect(getCliInfo()).resolves.toMatchObject(data);
    expect(invoke).toHaveBeenNthCalledWith(1, "run_cli", {
      args: ["option", "scan", "C:\\option"],
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "get_cli_info");
    expect(listen).not.toHaveBeenCalled();
    finish();
    await foreground;
  });

  it("shares in-flight requests and allows a later refresh", async () => {
    let finish!: (output: string) => void;
    vi.mocked(invoke).mockReturnValueOnce(
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
    );
    const first = getCliInfo();
    expect(getCliInfo()).toBe(first);
    expect(invoke).toHaveBeenCalledOnce();
    finish(output);
    await expect(first).resolves.toMatchObject(data);

    vi.mocked(invoke).mockResolvedValueOnce(output);
    await getCliInfo();
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("allows retry after a native failure or timeout", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("CLI info query did not finish"));
    await expect(getCliInfo()).rejects.toThrow("did not finish");
    vi.mocked(invoke).mockResolvedValueOnce(output);
    await expect(getCliInfo()).resolves.toMatchObject(data);
  });

  it.each([
    "",
    "invalid JSON",
    JSON.stringify({ type: "result", operation: "info", success: false, data }),
    JSON.stringify({ type: "result", operation: "option.scan", success: true, data }),
    JSON.stringify({ type: "result", operation: "info", success: true, data: {} }),
  ])("rejects unusable output and permits a retry: %s", async (invalidOutput) => {
    vi.mocked(invoke).mockResolvedValueOnce(invalidOutput);
    await expect(getCliInfo()).rejects.toThrow("missing or invalid");
    vi.mocked(invoke).mockResolvedValueOnce(output);
    await expect(getCliInfo()).resolves.toMatchObject(data);
  });
});

describe("subscribeCliEvents", () => {
  beforeEach(() => vi.resetAllMocks());

  it("releases the output listener if completion subscription fails", async () => {
    const unlisten = vi.fn();
    const failure = new Error("Subscription failed");
    vi.mocked(listen).mockResolvedValueOnce(unlisten).mockRejectedValueOnce(failure);
    await expect(subscribeCliEvents({ onLine: vi.fn(), onFinished: vi.fn() })).rejects.toBe(
      failure,
    );
    expect(unlisten).toHaveBeenCalledOnce();
  });

  it("forwards payloads and releases both listeners on cleanup", async () => {
    const unlistenOutput = vi.fn();
    const unlistenFinished = vi.fn();
    vi.mocked(listen).mockResolvedValueOnce(unlistenOutput).mockResolvedValueOnce(unlistenFinished);
    const onLine = vi.fn();
    const onFinished = vi.fn();
    const cleanup = await subscribeCliEvents({ onLine, onFinished });
    const [outputName, outputHandler] = vi.mocked(listen).mock.calls[0];
    const [finishedName, finishedHandler] = vi.mocked(listen).mock.calls[1];
    outputHandler({ event: outputName, id: 1, payload: "result line" });
    finishedHandler({ event: finishedName, id: 2, payload: { exitCode: 0, success: true } });
    expect(onLine).toHaveBeenCalledWith("result line");
    expect(onFinished).toHaveBeenCalledWith({ exitCode: 0, success: true });
    cleanup();
    expect(unlistenOutput).toHaveBeenCalledOnce();
    expect(unlistenFinished).toHaveBeenCalledOnce();
  });
});
