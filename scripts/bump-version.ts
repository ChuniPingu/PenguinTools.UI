#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type BumpKind = "patch" | "minor" | "major" | "set";

const root = join(import.meta.dir, "..");
const tauriConfPath = join(root, "src-tauri", "tauri.conf.json");
const packageJsonPath = join(root, "package.json");
const cargoTomlPath = join(root, "src-tauri", "Cargo.toml");

function parseArgs(argv: string[]): { kind: BumpKind; version?: string } {
  const bumpFlag = argv.find((arg) => arg.startsWith("--bump="));
  const versionFlag = argv.find((arg) => arg.startsWith("--version="));
  if (versionFlag) {
    return { kind: "set", version: versionFlag.slice("--version=".length) };
  }
  const kind = (bumpFlag?.slice("--bump=".length) ?? "patch") as BumpKind;
  if (kind !== "patch" && kind !== "minor" && kind !== "major") {
    throw new Error(`Invalid bump kind '${kind}'. Use patch, minor, or major.`);
  }
  return { kind };
}

function parseSemVer(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    throw new Error(`Invalid SemVer '${version}'. Expected X.Y.Z`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function bumpSemVer(version: string, kind: Exclude<BumpKind, "set">): string {
  const [major, minor, patch] = parseSemVer(version);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function readCurrentVersion(): string {
  const conf = JSON.parse(readFileSync(tauriConfPath, "utf8")) as { version?: string };
  if (!conf.version) {
    throw new Error("tauri.conf.json is missing version");
  }
  return conf.version;
}

function writePackageJson(version: string) {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as Record<string, unknown>;
  pkg.version = version;
  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function writeTauriConf(version: string) {
  const conf = JSON.parse(readFileSync(tauriConfPath, "utf8")) as Record<string, unknown>;
  conf.version = version;
  writeFileSync(tauriConfPath, `${JSON.stringify(conf, null, 2)}\n`);
}

function writeCargoToml(version: string) {
  const contents = readFileSync(cargoTomlPath, "utf8");
  const currentMatch = /^version\s*=\s*"([^"]+)"/m.exec(contents);
  if (!currentMatch) {
    throw new Error("Failed to find version in Cargo.toml");
  }
  if (currentMatch[1] === version) {
    return;
  }
  const next = contents.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
  if (next === contents) {
    throw new Error("Failed to update version in Cargo.toml");
  }
  writeFileSync(cargoTomlPath, next);
}

const args = parseArgs(Bun.argv.slice(2));
const current = readCurrentVersion();
let next: string;
if (args.kind === "set") {
  parseSemVer(args.version!);
  next = args.version!;
} else {
  next = bumpSemVer(current, args.kind);
}

writePackageJson(next);
writeTauriConf(next);
writeCargoToml(next);

console.log(next);
