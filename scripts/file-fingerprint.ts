import { createHash } from "node:crypto";
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export async function fingerprintFiles(root: string, files: string[]): Promise<string> {
  const hash = createHash("sha256");
  for (const file of [...new Set(files)].sort((left, right) => left.localeCompare(right, "en"))) {
    const path = join(root, file);
    let digest = "missing";
    if (existsSync(path)) {
      const content = createHash("sha256");
      for await (const chunk of createReadStream(path)) content.update(chunk);
      digest = content.digest("hex");
    }
    hash.update(JSON.stringify([file.replaceAll("\\", "/"), digest]));
  }
  return hash.digest("hex");
}

export function directoryFiles(root: string, relative = ""): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(join(root, relative)).flatMap((name) => {
    const file = join(relative, name);
    return statSync(join(root, file)).isDirectory() ? directoryFiles(root, file) : [file];
  });
}

export async function fingerprintDirectory(root: string): Promise<string> {
  return fingerprintFiles(root, directoryFiles(root));
}
