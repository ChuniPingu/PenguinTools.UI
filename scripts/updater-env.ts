#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "..");
const updaterKeyPath = join(projectRoot, ".updater.key");

function resolveKeyValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("\n") || trimmed.includes("BEGIN")) {
    return trimmed;
  }

  const candidates = [
    trimmed,
    isAbsolute(trimmed) ? trimmed : join(projectRoot, trimmed),
    join(projectRoot, trimmed),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return resolve(candidate);
    }
  }

  return trimmed;
}

/**
 * Bun auto-loads `.env` / `.env.local` for this process.
 * If TAURI_SIGNING_PRIVATE_KEY is still unset, point it at `.updater.key`.
 */
export function ensureUpdaterSigningKey(): string | null {
  if (process.env.TAURI_SIGNING_PRIVATE_KEY?.trim()) {
    const resolved = resolveKeyValue(process.env.TAURI_SIGNING_PRIVATE_KEY);
    process.env.TAURI_SIGNING_PRIVATE_KEY = resolved;
    return resolved;
  }

  if (!existsSync(updaterKeyPath)) {
    return null;
  }

  // Tauri accepts a file path or key contents.
  process.env.TAURI_SIGNING_PRIVATE_KEY = updaterKeyPath;
  return updaterKeyPath;
}

export function requireUpdaterSigningKey(): string {
  const value = ensureUpdaterSigningKey();
  if (!value) {
    throw new Error(
      `TAURI_SIGNING_PRIVATE_KEY is unset and '${updaterKeyPath}' was not found.\n\n` +
        `Put the private key in .env as TAURI_SIGNING_PRIVATE_KEY, or save it to .updater.key.`,
    );
  }
  return value;
}
