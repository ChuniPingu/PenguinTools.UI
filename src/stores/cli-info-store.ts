import { create } from "zustand";
import type { CliInfoData } from "@/lib/cli-results";
import { getCliInfo, isTauriRuntime } from "@/lib/tauri-cli";

interface CliInfoState {
  status: "idle" | "loading" | "success" | "error";
  info: CliInfoData | null;
  gameDirectory: string;
  setGameDirectory: (path: string) => void;
  refresh: () => Promise<void>;
}
export const useCliInfoStore = create<CliInfoState>((set, get) => ({
  status: "idle",
  info: null,
  gameDirectory: "",
  setGameDirectory: (gameDirectory) => set({ gameDirectory }),
  refresh: async () => {
    if (get().status === "loading" || !isTauriRuntime()) return;
    set({ status: "loading", info: null });
    try {
      set({ info: await getCliInfo(), status: "success" });
    } catch {
      set({ status: "error" });
    }
  },
}));
