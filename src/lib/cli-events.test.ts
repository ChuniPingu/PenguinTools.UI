import { describe, expect, it, vi } from "vite-plus/test";
import { handleCliLine } from "@/lib/cli-events";

function handlers() {
  return {
    appendLine: vi.fn(),
    setStatusDetail: vi.fn(),
    setProgressOperation: vi.fn(),
    setBusy: vi.fn(),
    showDiagnostics: vi.fn(),
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
    notifyInfo: vi.fn(),
    onResult: vi.fn(),
  };
}

const result =
  '{"type":"result","operation":"option.scan","success":true,"diagnostics":[],"data":{"config":{"hcaEncryptionKey":32931609366120192}}}';

describe("handleCliLine", () => {
  it("delivers exact CLI integer digits without marking the process idle", () => {
    const callbacks = handlers();
    handleCliLine(result, callbacks);
    expect(callbacks.onResult).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { config: { hcaEncryptionKey: "32931609366120192" } },
      }),
    );
    expect(callbacks.setBusy).not.toHaveBeenCalled();
  });

  it("lets callback failures reach the caller without duplicating output", () => {
    const callbacks = handlers();
    const error = new Error("Failed to apply chart metadata");
    callbacks.onResult.mockImplementation(() => {
      throw error;
    });
    expect(() => handleCliLine(result, callbacks)).toThrow(error);
    expect(callbacks.appendLine).toHaveBeenCalledExactlyOnceWith(result);
  });

  it.each(["plain output", "null", "42"])("keeps non-event output: %s", (line) => {
    const callbacks = handlers();
    handleCliLine(line, callbacks);
    expect(callbacks.appendLine).toHaveBeenCalledExactlyOnceWith(line);
    expect(callbacks.onResult).not.toHaveBeenCalled();
  });
});
