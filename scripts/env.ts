#!/usr/bin/env bun

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Required environment variable '${name}' is not set.`);
  }
  return value;
}

export function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

export function missingEnv(names: readonly string[]): string[] {
  return names.filter((name) => !process.env[name]?.trim());
}

export function assertRequiredEnv(names: readonly string[], options?: { hint?: string }): void {
  const missing = missingEnv(names);
  if (missing.length === 0) return;

  const listed = missing.map((name) => `  - ${name}`).join("\n");
  const hint = options?.hint ? `\n\n${options.hint}` : "";
  throw new Error(`Missing required environment variable(s):\n${listed}${hint}`);
}

export const S3_REQUIRED_ENV = [
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET",
] as const;
