import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/lib/tauri-cli";

export async function readTextFile(path: string) {
  if (!isTauriRuntime()) throw new Error("File access requires the Tauri app.");
  return invoke<string>("read_text_file", { path });
}

export async function writeTextFile(path: string, contents: string) {
  if (!isTauriRuntime()) throw new Error("File access requires the Tauri app.");
  return invoke<void>("write_text_file", { path, contents });
}

export async function pathExists(path: string) {
  if (!isTauriRuntime()) return false;
  return invoke<boolean>("path_exists", { path });
}
