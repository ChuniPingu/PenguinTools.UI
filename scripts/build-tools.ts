import { accessSync, constants, realpathSync, statSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";

/** Resolve installed tools before changing cwd; never search the current directory. */
export function resolveBuildTool(
  name: "git" | "dotnet",
  searchPath = process.env.PATH ?? "",
  cwd = process.cwd(),
): string {
  const currentDirectory = realpathSync(cwd);
  const executable = process.platform === "win32" ? `${name}.exe` : name;
  for (const entry of searchPath.split(delimiter)) {
    if (!isAbsolute(entry)) continue;
    try {
      const directory = realpathSync(entry);
      const sameDirectory =
        process.platform === "win32"
          ? directory.toLowerCase() === currentDirectory.toLowerCase()
          : directory === currentDirectory;
      if (sameDirectory) continue;
      const candidate = join(directory, executable);
      accessSync(candidate, constants.X_OK);
      if (statSync(candidate).isFile()) return realpathSync(candidate);
    } catch {
      // Missing or inaccessible PATH entries do not provide an installed tool.
    }
  }
  throw new Error(`Required build tool '${name}' was not found in an absolute PATH directory.`);
}
