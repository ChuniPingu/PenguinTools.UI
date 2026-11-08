import { afterEach, describe, expect, it } from "vite-plus/test";
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { resolveBuildTool } from "./build-tools";

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "penguin-build-tools-"));
  roots.push(root);
  const installed = join(root, "installed");
  mkdirSync(installed);
  const name = process.platform === "win32" ? "git.exe" : "git";
  for (const directory of [root, installed]) {
    const file = join(directory, name);
    writeFileSync(file, "tool");
    chmodSync(file, 0o755);
  }
  return { root, installed, executable: realpathSync(join(installed, name)) };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("build tool resolution", () => {
  it("ignores empty, relative and current-directory entries before selecting an installed tool", () => {
    const { root, installed, executable } = fixture();
    expect(
      resolveBuildTool("git", ["", ".", "installed", root, installed].join(delimiter), root),
    ).toBe(executable);
  });

  it("skips missing directories and returns an absolute executable path", () => {
    const { root, installed, executable } = fixture();
    expect(resolveBuildTool("git", [join(root, "missing"), installed].join(delimiter), root)).toBe(
      executable,
    );
  });

  it("fails instead of falling back to a tool in the current directory", () => {
    const { root } = fixture();
    expect(() => resolveBuildTool("git", ["", ".", root].join(delimiter), root)).toThrow(
      "Required build tool 'git'",
    );
  });
});
