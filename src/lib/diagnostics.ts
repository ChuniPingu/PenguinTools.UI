export type NormalizedSeverity = "Error" | "Warning" | "Information";

export function normalizeSeverity(severity: string): NormalizedSeverity {
  const normalized = severity.toLowerCase();
  if (normalized === "error") return "Error";
  if (normalized === "warning") return "Warning";
  return "Information";
}
