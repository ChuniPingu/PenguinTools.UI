import { create } from "zustand";
import type { CliProgressEvent, MessageDescriptor } from "@/lib/cli-types";

export interface CliActivity {
  id: string;
  operation: string | null;
  startedAt: number;
  endedAt?: number;
  status: "running" | "success" | "error" | "cancelled";
  progress?: CliProgressEvent;
  output?: string;
  message?: MessageDescriptor | null;
}

interface ActivityState {
  activity: CliActivity | null;
  activeCount: number;
  start: (id: string, operation: string | null) => void;
  update: (id: string, detail: Pick<CliActivity, "progress" | "output">) => void;
  finish: (
    id: string,
    status: Exclude<CliActivity["status"], "running">,
    detail?: Pick<CliActivity, "output" | "message">,
  ) => void;
}

// Keep only active tasks and the last completion; bursty output never queues animations.
export function createCliActivityStore() {
  return create<ActivityState>((set) => {
    const active = new Map<string, CliActivity>();
    let latest: CliActivity | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const publish = () => {
      clearTimeout(timer);
      timer = undefined;
      set({ activity: [...active.values()].pop() ?? latest, activeCount: active.size });
    };
    return {
      activity: null,
      activeCount: 0,
      start(id, operation) {
        active.set(id, { id, operation, startedAt: Date.now(), status: "running" });
        publish();
      },
      update(id, detail) {
        const current = active.get(id);
        if (!current) return;
        active.set(id, { ...current, ...detail });
        timer ??= setTimeout(publish, 180);
      },
      finish(id, status, detail) {
        const current = active.get(id);
        if (!current) return;
        latest = { ...current, ...detail, status, endedAt: Date.now() };
        active.delete(id);
        publish();
      },
    };
  });
}

export const useCliActivityStore = createCliActivityStore();
