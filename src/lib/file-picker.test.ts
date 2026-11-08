import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/tauri-cli";
import { FILE_DIALOG_IDS, pickOutputFolder, pickPath, pickSavePath } from "./file-picker";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@/lib/tauri-cli", () => ({ isTauriRuntime: vi.fn(() => true) }));
vi.mock("@/i18n", () => ({ t: (key: string) => key }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isTauriRuntime).mockReturnValue(true);
  vi.mocked(invoke).mockResolvedValue(null);
});

describe("native file dialog bridge", () => {
  it("uses a distinct valid GUID for every picker", () => {
    const ids = Object.values(FILE_DIALOG_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    }
  });

  it("passes input identity, filters and the selected path to the native dialog", async () => {
    const filters = [{ name: "谱面", extensions: ["mgxc", "ugc"] }];
    vi.mocked(invoke).mockResolvedValue("D:\\谱面\\new.mgxc");
    expect(
      await pickPath({
        historyKey: "convert.chart.input",
        defaultPath: "D:\\谱面\\old.mgxc",
        filters,
      }),
    ).toBe("D:\\谱面\\new.mgxc");
    expect(invoke).toHaveBeenCalledWith("pick_file_dialog", {
      options: {
        clientGuid: FILE_DIALOG_IDS["convert.chart.input"],
        mode: "file",
        defaultPath: "D:\\谱面\\old.mgxc",
        filters,
      },
    });
  });

  it("keeps save and folder histories separate from input and preserves cancellation", async () => {
    expect(
      await pickSavePath({ historyKey: "convert.chart.output", defaultPath: "D:\\new.c2s" }),
    ).toBeNull();
    expect(invoke).toHaveBeenLastCalledWith("pick_file_dialog", {
      options: {
        clientGuid: FILE_DIALOG_IDS["convert.chart.output"],
        mode: "save",
        defaultPath: "D:\\new.c2s",
      },
    });
    await pickOutputFolder("convert.audio.output", "D:\\audio");
    expect(invoke).toHaveBeenLastCalledWith("pick_file_dialog", {
      options: {
        clientGuid: FILE_DIALOG_IDS["convert.audio.output"],
        mode: "folder",
        defaultPath: "D:\\audio",
        filters: undefined,
      },
    });
  });

  it("does not invoke native dialogs in browser previews", async () => {
    vi.mocked(isTauriRuntime).mockReturnValue(false);
    expect(await pickPath({ historyKey: "convert.chart.input" })).toBeNull();
    expect(await pickSavePath({ historyKey: "convert.chart.output" })).toBeNull();
    expect(await pickOutputFolder("convert.audio.output")).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });
});
