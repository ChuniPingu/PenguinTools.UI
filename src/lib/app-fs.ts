import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/tauri-cli";
import { t } from "@/i18n";

export async function readTextFile(path: string) {
  if (!isTauriRuntime()) throw new Error(t("ui.common.notify.unavailable"));
  return await invoke<string>("read_text_file", { path });
}

export async function writeTextFile(path: string, contents: string) {
  if (!isTauriRuntime()) throw new Error(t("ui.common.notify.unavailable"));
  return await invoke<void>("write_text_file", { path, contents });
}

export async function pathExists(path: string) {
  if (!isTauriRuntime()) return false;
  return await invoke<boolean>("path_exists", { path });
}
