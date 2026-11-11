import { PageTaskController, taskIsBusy } from "./page-task-controller";
import { t } from "@/i18n";
import { isTauriRuntime } from "./tauri-cli";
import type { CliDiagnosticPayload, CliResponse } from "./cli-types";

export const pageTaskRoutes = {
  option: "/option",
  chart: "/chart",
  jacket: "/jacket",
  audio: "/audio",
  stage: "/stage",
  extractMusic: "/extract/music",
  extractChart: "/extract/chart",
  extractAudio: "/extract/audio",
  extractStage: "/extract/stage",
  misc: "/misc",
} as const;
export type TaskPage = keyof typeof pageTaskRoutes;
export interface PageTaskResult {
  page: TaskPage;
  response: CliResponse;
  diagnostics: CliDiagnosticPayload[];
}
export interface PageTaskError {
  page: TaskPage;
  message: string;
}
const controllers = new Map<TaskPage, PageTaskController>();
const listeners = new Set<() => void>();
const resultListeners = new Set<(result: PageTaskResult) => void>();
const errorListeners = new Set<(error: PageTaskError) => void>();
export function subscribeTaskErrors(listener: (error: PageTaskError) => void) {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}
export function subscribeTaskResults(listener: (result: PageTaskResult) => void) {
  resultListeners.add(listener);
  return () => {
    resultListeners.delete(listener);
  };
}
export function subscribePageTaskResults(
  page: TaskPage,
  listener: (result: PageTaskResult) => void,
) {
  return subscribeTaskResults((result) => {
    if (result.page === page) listener(result);
  });
}
let updating = false;
function emit() {
  for (const listener of listeners) listener();
}
export const subscribePageTasks = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getActivePageTasks = () =>
  [...controllers.entries()].filter(([, task]) => taskIsBusy(task.getSnapshot()));
export const getActivePageIds = () =>
  getActivePageTasks()
    .map(([page]) => page)
    .join(",");
export const getActiveTaskCount = () => getActivePageTasks().length;
export const assetsAreBusy = () =>
  getActivePageTasks().some(([, task]) => task.getSnapshot().operation === "assets.collect");
export function setPageTasksBlocked(blocked: boolean) {
  updating = blocked;
  emit();
}
export const pageTasksBlocked = () => updating || assetsAreBusy();

export function getPageTask(page: TaskPage) {
  let controller = controllers.get(page);
  if (!controller) {
    controller = new PageTaskController(page, {
      blocked: () => pageTasksBlocked() || !isTauriRuntime(),
      prepare: (operation) => {
        // The collector reserves the assets gate as soon as its waiting state is published.
        if (operation === "assets.collect") return waitForAssetReaders(page);
        if (updating || assetsAreBusy())
          throw new Error(
            t(updating ? "ui.cli.notify.blockedDuringUpdate" : "ui.tasks.notify.assetsBusy"),
          );
      },
      complete: (response, diagnostics) => {
        for (const listener of resultListeners) listener({ page, response, diagnostics });
      },
      reportError: (message) => {
        for (const listener of errorListeners) listener({ page, message });
      },
    });
    controllers.set(page, controller);
    controller.subscribe(emit);
  }
  return controller;
}

function waitForAssetReaders(page: TaskPage) {
  if (!getActivePageTasks().some(([other]) => other !== page)) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const unsubscribe = subscribePageTasks(() => {
      const collector = getPageTask(page).getSnapshot();
      if (
        collector.status === "cancelling" ||
        !getActivePageTasks().some(([other]) => other !== page)
      ) {
        unsubscribe();
        resolve();
      }
    });
  });
}
