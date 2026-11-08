import { invoke } from "@tauri-apps/api/core";
import { t } from "@/i18n";
import { isTauriRuntime } from "@/lib/tauri-cli";

export interface FileFilter {
  name: string;
  extensions: string[];
}

// Persisted Windows identities: never regenerate or reuse an existing GUID.
export const FILE_DIALOG_IDS = {
  "export.option.input": "53a19c2d-e913-4f17-b8f9-51e899000001",
  "export.option.output": "53a19c2d-e913-4f17-b8f9-51e899000002",
  "convert.song.input": "53a19c2d-e913-4f17-b8f9-51e899000003",
  "convert.song.output": "53a19c2d-e913-4f17-b8f9-51e899000004",
  "convert.chart.input": "53a19c2d-e913-4f17-b8f9-51e899000005",
  "convert.chart.output": "53a19c2d-e913-4f17-b8f9-51e899000006",
  "convert.audio.input": "53a19c2d-e913-4f17-b8f9-51e899000007",
  "convert.audio.output": "53a19c2d-e913-4f17-b8f9-51e899000008",
  "convert.jacket.input": "53a19c2d-e913-4f17-b8f9-51e899000009",
  "convert.jacket.output": "53a19c2d-e913-4f17-b8f9-51e89900000a",
  "convert.stage.input": "53a19c2d-e913-4f17-b8f9-51e89900000b",
  "convert.stage.output": "53a19c2d-e913-4f17-b8f9-51e89900000c",
  "stage-effect-0": "53a19c2d-e913-4f17-b8f9-51e89900000d",
  "stage-effect-1": "53a19c2d-e913-4f17-b8f9-51e89900000e",
  "stage-effect-2": "53a19c2d-e913-4f17-b8f9-51e89900000f",
  "stage-effect-3": "53a19c2d-e913-4f17-b8f9-51e899000010",
  "extract.music.input": "53a19c2d-e913-4f17-b8f9-51e899000011",
  "extract.music.output": "53a19c2d-e913-4f17-b8f9-51e899000012",
  "extract.chart.input": "53a19c2d-e913-4f17-b8f9-51e899000013",
  "extract.chart.output": "53a19c2d-e913-4f17-b8f9-51e899000014",
  "extract.audio.input": "53a19c2d-e913-4f17-b8f9-51e899000015",
  "extract.audio.output": "53a19c2d-e913-4f17-b8f9-51e899000016",
  "extract.stage.input": "53a19c2d-e913-4f17-b8f9-51e899000017",
  "extract.stage.output": "53a19c2d-e913-4f17-b8f9-51e899000018",
  "onboarding.gameDirectory": "53a19c2d-e913-4f17-b8f9-51e899000019",
  "system.gameDirectory": "53a19c2d-e913-4f17-b8f9-51e89900001a",
} as const;

export type FileDialogHistoryKey = keyof typeof FILE_DIALOG_IDS;

export interface PickOptions {
  historyKey: FileDialogHistoryKey;
  mode?: "file" | "folder";
  filters?: FileFilter[];
  defaultPath?: string;
}

export async function pickPath(options: PickOptions): Promise<string | null> {
  const { historyKey, mode = "file", filters, defaultPath } = options;
  if (!isTauriRuntime()) return null;

  return await invoke<string | null>("pick_file_dialog", {
    options: {
      clientGuid: FILE_DIALOG_IDS[historyKey],
      mode,
      filters: mode === "file" ? filters : undefined,
      defaultPath: defaultPath || undefined,
    },
  });
}

export async function pickSavePath(options: {
  historyKey: FileDialogHistoryKey;
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const { historyKey, ...dialogOptions } = options;
  return await invoke<string | null>("pick_file_dialog", {
    options: { ...dialogOptions, clientGuid: FILE_DIALOG_IDS[historyKey], mode: "save" },
  });
}

export async function pickOutputFolder(
  historyKey: FileDialogHistoryKey,
  defaultPath?: string,
): Promise<string | null> {
  return await pickPath({ historyKey, mode: "folder", defaultPath });
}

type FilterNameKey =
  | "ui.filePicker.filters.chart"
  | "ui.filePicker.filters.c2s"
  | "ui.filePicker.filters.image"
  | "ui.filePicker.filters.audio"
  | "ui.filePicker.filters.awb"
  | "ui.filePicker.filters.musicXml"
  | "ui.filePicker.filters.afb";

function filter(nameKey: FilterNameKey, extensions: string[]): FileFilter {
  return {
    get name() {
      return t(nameKey);
    },
    extensions,
  };
}

export const CHART_FILE_FILTERS: FileFilter[] = [
  filter("ui.filePicker.filters.chart", ["mgxc", "ugc", "sus"]),
];
export const CHART_SOURCE_FILTERS: FileFilter[] = [
  filter("ui.filePicker.filters.chart", ["mgxc", "ugc"]),
];
export const C2S_FILE_FILTERS: FileFilter[] = [filter("ui.filePicker.filters.c2s", ["c2s"])];
export const IMAGE_FILE_FILTERS: FileFilter[] = [
  filter("ui.filePicker.filters.image", ["png", "jpg", "jpeg", "bmp", "webp"]),
];
export const AUDIO_FILE_FILTERS: FileFilter[] = [
  filter("ui.filePicker.filters.audio", ["wav", "ogg", "mp3"]),
];
export const AUDIO_SOURCE_FILTERS: FileFilter[] = [...AUDIO_FILE_FILTERS, ...CHART_SOURCE_FILTERS];
export const IMAGE_SOURCE_FILTERS: FileFilter[] = [...IMAGE_FILE_FILTERS, ...CHART_SOURCE_FILTERS];
export const AWB_FILE_FILTERS: FileFilter[] = [filter("ui.filePicker.filters.awb", ["awb"])];
export const MUSIC_XML_FILTERS: FileFilter[] = [filter("ui.filePicker.filters.musicXml", ["xml"])];
export const AFB_FILE_FILTERS: FileFilter[] = [filter("ui.filePicker.filters.afb", ["afb"])];
