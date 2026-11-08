import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, join } from "node:path";
import { fingerprintPublishInputs } from "./publish-cache";
import { resolveBuildTool } from "./build-tools";

const sdk = vi.hoisted(() => ({ info: "SDK 10.0.100" }));
vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:child_process")>();
  return {
    ...original,
    execFileSync: (command: string, args: string[], options: object) =>
      basename(command).replace(/\.exe$/i, "") === "dotnet"
        ? sdk.info
        : original.execFileSync(command, args, options),
  };
});
vi.mock("./build-tools", async (importOriginal) => {
  const original = await importOriginal<typeof import("./build-tools")>();
  return {
    resolveBuildTool: (name: "git" | "dotnet") =>
      name === "dotnet" ? "/mock-tools/dotnet" : original.resolveBuildTool(name),
  };
});

const gitExecutable = resolveBuildTool("git");

const roots: string[] = [];
function write(root: string, file: string, content: string): void {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "penguin-publish-inputs-"));
  roots.push(root);
  const backend = join(root, "external", "PenguinTools");
  mkdirSync(backend, { recursive: true });
  execFileSync(gitExecutable, ["init", "--quiet", backend]);
  write(backend, ".gitignore", "bin/\nobj/\nartifacts/\n");
  write(backend, "Main.cs", "original");
  execFileSync(gitExecutable, ["add", "."], { cwd: backend });
  return { root, backend };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  sdk.info = "SDK 10.0.100";
  vi.unstubAllEnvs();
});

describe("publish inputs", () => {
  it("ignores task-runner PATH entries while tracking compiler environment", async () => {
    const { root } = fixture();
    const initial = await fingerprintPublishInputs(root, "aot");
    const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === "PATH")!;
    vi.stubEnv(pathKey, `${process.env[pathKey]}${delimiter}${join(root, "temporary-shims")}`);
    expect(await fingerprintPublishInputs(root, "aot")).toBe(initial);
    vi.stubEnv("VCToolsVersion", "different-version");
    expect(await fingerprintPublishInputs(root, "aot")).not.toBe(initial);
  });

  it("detects dirty, added, and deleted source files by content", async () => {
    const { root, backend } = fixture();
    const initial = await fingerprintPublishInputs(root, "aot");
    utimesSync(join(backend, "Main.cs"), new Date(0), new Date(0));
    expect(await fingerprintPublishInputs(root, "aot")).toBe(initial);
    write(backend, "Main.cs", "modified");
    expect(await fingerprintPublishInputs(root, "aot")).not.toBe(initial);
    write(backend, "Main.cs", "original");
    write(backend, "New.cs", "new");
    expect(await fingerprintPublishInputs(root, "aot")).not.toBe(initial);
    rmSync(join(backend, "New.cs"));
    rmSync(join(backend, "Main.cs"));
    expect(await fingerprintPublishInputs(root, "aot")).not.toBe(initial);
  });

  it("excludes build output, temporary files, frontend and Rust changes", async () => {
    const { root, backend } = fixture();
    const initial = await fingerprintPublishInputs(root, "aot");
    write(backend, "bin/output.dll", "build");
    write(backend, "obj/project.assets.json", "restore");
    write(backend, ".tmp/scratch.cs", "scratch");
    write(root, "src/App.tsx", "frontend");
    write(root, "src-tauri/src/lib.rs", "rust");
    expect(await fingerprintPublishInputs(root, "aot")).toBe(initial);
  });

  it("includes nested repository working trees", async () => {
    const { root, backend } = fixture();
    const nested = join(backend, "External", "codec");
    mkdirSync(nested, { recursive: true });
    execFileSync(gitExecutable, ["init", "--quiet", nested]);
    write(nested, "Codec.cs", "original");
    const initial = await fingerprintPublishInputs(root, "aot");
    write(nested, "Codec.cs", "modified");
    expect(await fingerprintPublishInputs(root, "aot")).not.toBe(initial);
  });

  it("includes publish configuration, SDK, profile, and build scripts", async () => {
    const { root, backend } = fixture();
    const initial = await fingerprintPublishInputs(root, "aot");
    expect(await fingerprintPublishInputs(root, "fdd")).not.toBe(initial);
    sdk.info = "SDK 10.0.101";
    expect(await fingerprintPublishInputs(root, "aot")).not.toBe(initial);
    sdk.info = "SDK 10.0.100";
    write(backend, "Common.props", "version update");
    expect(await fingerprintPublishInputs(root, "aot")).not.toBe(initial);
    rmSync(join(backend, "Common.props"));
    write(root, "scripts/build-cli.ts", "new publish flags");
    expect(await fingerprintPublishInputs(root, "aot")).not.toBe(initial);
  });
});
