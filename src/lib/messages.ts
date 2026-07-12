import i18n from "@/i18n";
import type { MessageDescriptor } from "@/lib/cli-types";

function normalizeArgs(args?: Record<string, unknown> | null): Record<string, unknown> {
  if (!args) return {};

  const normalized: Record<string, unknown> = { ...args };
  for (const [key, value] of Object.entries(args)) {
    const indexMatch = /^arg(\d+)$/.exec(key);
    if (indexMatch) {
      normalized[indexMatch[1]] ??= value;
    }
  }

  return normalized;
}

export function resolveMessage(descriptor: MessageDescriptor): string {
  return i18n.t(descriptor.key, {
    defaultValue: descriptor.key,
    ...normalizeArgs(descriptor.args),
  });
}

export function formatDiagnosticLocation(path?: string | null, line?: number | null): string {
  if (!path) return "";
  if (line != null) return `${path}:${line}`;
  return path;
}
