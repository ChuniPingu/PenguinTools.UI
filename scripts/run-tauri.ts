#!/usr/bin/env bun
import { $ } from "bun";
import { ensureUpdaterSigningKey, requireUpdaterSigningKey } from "./updater-env";

const args = Bun.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: bun scripts/run-tauri.ts <dev|build|...> [...tauri args]");
  process.exit(1);
}

// Resolve signing env before spawning tauri so misconfiguration fails immediately.
if (args[0] === "build") {
  requireUpdaterSigningKey();
} else {
  ensureUpdaterSigningKey();
}

await $`tauri ${args}`;
