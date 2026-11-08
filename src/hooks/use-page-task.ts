import { useSyncExternalStore } from "react";
import { getPageTask, pageTasksBlocked, subscribePageTasks, type TaskPage } from "@/lib/page-tasks";
import { taskIsBusy } from "@/lib/page-task-controller";
import { isTauriRuntime } from "@/lib/tauri-cli";

export function usePageTask(page: TaskPage) {
  const controller = getPageTask(page);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const blocked = useSyncExternalStore(subscribePageTasks, pageTasksBlocked, pageTasksBlocked);
  return {
    page,
    state,
    run: controller.run,
    runCommand: controller.runCommand,
    cancel: controller.cancel,
    reset: controller.reset,
    setSource: controller.setSource,
    hasAttempted: controller.hasAttempted,
    busy: taskIsBusy(state),
    blocked: blocked || !isTauriRuntime(),
  };
}
