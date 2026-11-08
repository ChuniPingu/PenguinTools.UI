import type { PageTaskResult } from "./page-tasks";
import { resolveMessage } from "./messages";

export function presentTaskResult(
  { response, diagnostics }: PageTaskResult,
  handlers: {
    notifyError: (message: string) => void;
  },
) {
  if (response.operation === "info" || response.success || !response.message) return;
  if (!diagnostics.length) {
    handlers.notifyError(resolveMessage(response.message));
  }
}
