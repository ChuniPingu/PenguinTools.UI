import { open, save } from "@tauri-apps/plugin-dialog";
import { t } from "@/i18n";
import { isTauriRuntime } from "@/lib/tauri-cli";

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface PickOptions {
  mode?: "file" | "folder";
  filters?: FileFilter[];
  defaultPath?: string;
}

export async function pickPath(options: PickOptions = {}): Promise<string | null> {
  const { mode = "file", filters, defaultPath } = options;
  if (!isTauriRuntime()) return null;

  const selected = await open({
    directory: mode === "folder",
    multiple: false,
    filters: mode === "file" ? filters : undefined,
    defaultPath: defaultPath || undefined,
  });

  if (selected == null || Array.isArray(selected)) return null;
  return selected;
}

export async function pickSavePath(options: {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  return save(options);
}

export async function pickOutputFolder(defaultPath?: string): Promise<string | null> {
  return pickPath({ mode: "folder", defaultPath });
}

type FilterNameKey =
  | "ui.filePicker.filters.chart"
  | "ui.filePicker.filters.c2s"
  | "ui.filePicker.filters.image"
  | "ui.filePicker.filters.audio"
  | "ui.filePicker.filters.criAudio"
  | "ui.filePicker.filters.musicXml"
  | "ui.filePicker.filters.jacket"
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
  filter("ui.filePicker.filters.chart", ["mgxc", "ugc", "sus", "c2s"]),
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
export const CRI_AUDIO_FILTERS: FileFilter[] = [
  filter("ui.filePicker.filters.criAudio", ["acb", "awb"]),
];
export const MUSIC_XML_FILTERS: FileFilter[] = [filter("ui.filePicker.filters.musicXml", ["xml"])];
export const JACKET_EXTRACT_FILTERS: FileFilter[] = [
  filter("ui.filePicker.filters.jacket", ["dds", "png", "jpg", "jpeg", "bmp", "webp"]),
];
export const AFB_FILE_FILTERS: FileFilter[] = [filter("ui.filePicker.filters.afb", ["afb"])];
