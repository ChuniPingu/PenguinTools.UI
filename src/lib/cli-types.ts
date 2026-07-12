export interface MessageDescriptor {
  key: string;
  args?: Record<string, unknown> | null;
}

export type DiagnosticSeverity = "Error" | "Warning" | "Information" | string;

export interface CliDiagnosticPayload {
  severity: DiagnosticSeverity;
  message: MessageDescriptor;
  path?: string | null;
  line?: number | null;
  time?: number | null;
}

export interface CliProgressEvent {
  type: "progress";
  operation: string;
  item?: string | null;
  label?: string | null;
  completed?: number | null;
  total?: number | null;
  percent?: number | null;
}

export interface CliResponse {
  type: "result";
  schemaVersion: number;
  operation: string;
  success: boolean;
  exitCode: number;
  message?: MessageDescriptor | null;
  data?: unknown;
  diagnostics: CliDiagnosticPayload[];
}

export const DOCUMENTATION_URL =
  "https://github.com/ChuniPingu/PenguinTools/wiki/%E4%B8%AD%E6%96%87";
