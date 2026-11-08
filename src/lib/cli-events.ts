import { t } from "@/i18n";
import { parseCliJsonLine } from "@/lib/cli-json";
import { progressSecondaryDetail } from "@/lib/cli-progress";
import type { CliDiagnosticPayload, CliResponse } from "@/lib/cli-types";
import { collectOptionScanDiagnostics, summarizeCliDiagnostics } from "@/lib/cli-results";
import { resolveMessage } from "@/lib/messages";

interface ProgressState {
  completed: number;
  total: number;
}
interface CliLineHandlers {
  appendLine: (line: string) => void;
  setStatusDetail: (detail: string) => void;
  setProgressOperation: (operation: string | null) => void;
  setBusy: (busy: boolean, progress?: ProgressState | null) => void;
  showDiagnostics: (items: CliDiagnosticPayload[]) => void;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
  onResult?: (response: CliResponse) => void;
}

const SILENT_SUCCESS_OPERATIONS = new Set(["info"]);

export function handleCliLine(line: string, handlers: CliLineHandlers) {
  const { appendLine } = handlers;
  let parsed: unknown;
  try {
    parsed = parseCliJsonLine(line);
  } catch {
    appendLine(line);
    return;
  }
  if (parsed == null || typeof parsed !== "object") {
    appendLine(line);
    return;
  }
  const payload = parsed as Record<string, unknown>;

  if (payload.type === "stderr") {
    appendLine(typeof payload.message === "string" ? payload.message : line);
    return;
  }

  appendLine(line);

  if (payload.type === "progress") {
    handleProgress(payload, handlers);
  } else if (payload.type === "result") {
    handleResult(payload as unknown as CliResponse, handlers);
  }
}

function handleProgress(
  payload: Record<string, unknown>,
  { setProgressOperation, setStatusDetail, setBusy }: CliLineHandlers,
) {
  const completed = typeof payload.completed === "number" ? payload.completed : undefined;
  const total = typeof payload.total === "number" ? payload.total : undefined;
  const item = typeof payload.item === "string" ? payload.item : undefined;
  const label = typeof payload.label === "string" ? payload.label : undefined;
  const operation = typeof payload.operation === "string" ? payload.operation : undefined;

  if (operation) setProgressOperation(operation);
  setStatusDetail(progressSecondaryDetail(item, label));
  if (completed != null && total != null) {
    setBusy(true, { completed, total });
  } else {
    setBusy(true, null);
  }
}

function handleResult(
  response: CliResponse,
  { notifySuccess, notifyInfo, notifyError, showDiagnostics, onResult }: CliLineHandlers,
) {
  const diagnostics =
    response.operation === "option.scan"
      ? collectOptionScanDiagnostics(response)
      : (response.diagnostics ?? []);
  const message = response.message ? resolveMessage(response.message) : undefined;

  if (response.success) {
    const summary = summarizeCliDiagnostics(diagnostics);
    if (message && !SILENT_SUCCESS_OPERATIONS.has(response.operation)) {
      notifySuccess(message);
    } else if (!message && summary) {
      notifyInfo(t("ui.cli.notify.completedWith", { summary }));
    }
  } else if (message) {
    notifyError(message);
  }

  if (diagnostics.length > 0) {
    showDiagnostics(diagnostics);
  }

  onResult?.(response);
}
