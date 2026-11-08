import i18n from "@/i18n";

/** Map CLI argv (e.g. `music build …`) to the CLI operation id (`music.build`). */
export function operationFromCliArgs(args: string[]): string | null {
  const command = args[0];
  if (!command || command.startsWith("-")) return null;
  if (command === "info") return "info";

  const subcommand = args[1];
  if (!subcommand || subcommand.startsWith("-")) return command;
  return `${command}.${subcommand}`;
}

/** Prefer human label (e.g. song title); fall back to item filename. */
export function progressSecondaryDetail(item?: string | null, label?: string | null): string {
  const trimmedLabel = label?.trim();
  if (trimmedLabel) return trimmedLabel;
  return item?.trim() ?? "";
}

export function formatProgressStatusLine(operationLabel: string, detail?: string): string {
  if (detail) return `${operationLabel} · ${detail}`;
  return operationLabel;
}

export function progressOperationMessageKey(operation: string): string {
  return `ui.progress.operations.${operation}`;
}

export function resolveProgressOperationLabel(operation: string | null): string {
  const fallback = i18n.t("ui.progress.working");
  if (!operation) return fallback;
  const key = progressOperationMessageKey(operation);
  if (!i18n.exists(key)) return fallback;
  return i18n.t(key, { defaultValue: fallback });
}
