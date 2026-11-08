export interface MessageDescriptor {
  key: string;
  args?: Record<string, unknown> | null;
}

/** Chart-relative position from PenguinTools TimeCalculator (1-based bar/beat). */
export interface CliTickPosition {
  bar: number;
  beat: number;
  tickOffset: number;
}

export interface CliDiagnosticPayload {
  /** Includes future CLI severities as well as Error, Warning, and Information. */
  severity: string;
  message: MessageDescriptor;
  path?: string | null;
  line?: number | null;
  /** Absolute chart tick. Prefer formatting via `timePosition` when present. */
  time?: number | null;
  timePosition?: CliTickPosition | null;
  /** AOT-safe diagnostic target DTO (e.g. note / note pair). */
  target?: unknown;
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
