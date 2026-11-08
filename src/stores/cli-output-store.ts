import { create } from "zustand";

export const MAX_OUTPUT_LINES = 5000;
export const MAX_OUTPUT_CHARACTERS = 2_000_000;
const FLUSH_INTERVAL_MS = 50;

interface OutputState {
  lines: string[];
  truncated: boolean;
  open: boolean;
  append: (line: string) => void;
  clear: () => void;
  toggle: () => void;
}

export const useCliOutputStore = create<OutputState>((set) => {
  let pending: string[] = [];
  let pendingCharacters = 0;
  let pendingTruncated = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    lines: [],
    truncated: false,
    open: false,
    append(line) {
      if (line.length > MAX_OUTPUT_CHARACTERS) {
        line = line.slice(-MAX_OUTPUT_CHARACTERS);
        pendingTruncated = true;
      }
      pending.push(line);
      pendingCharacters += line.length;
      while (pending.length > MAX_OUTPUT_LINES || pendingCharacters > MAX_OUTPUT_CHARACTERS) {
        pendingCharacters -= pending.shift()!.length;
        pendingTruncated = true;
      }
      timer ??= setTimeout(() => {
        timer = undefined;
        set((state) => {
          const lines = [...state.lines, ...pending];
          let characters = lines.reduce((count, value) => count + value.length, 0);
          let first = 0;
          while (lines.length - first > MAX_OUTPUT_LINES || characters > MAX_OUTPUT_CHARACTERS) {
            characters -= lines[first++].length;
          }
          return {
            lines: lines.slice(first),
            truncated: state.truncated || pendingTruncated || first > 0,
          };
        });
        pending = [];
        pendingCharacters = 0;
        pendingTruncated = false;
      }, FLUSH_INTERVAL_MS);
    },
    clear() {
      clearTimeout(timer);
      timer = undefined;
      pending = [];
      pendingCharacters = 0;
      pendingTruncated = false;
      set({ lines: [], truncated: false });
    },
    toggle: () => set((state) => ({ open: !state.open })),
  };
});

export const appendCliLine = (line: string) => useCliOutputStore.getState().append(line);
