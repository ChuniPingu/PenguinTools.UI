import { existsSync, lstatSync, symlinkSync, unlinkSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "..");
const localesDir = join(projectRoot, "src", "locales");
const sourceDir = join(projectRoot, "external", "PenguinTools", "docs", "locales");

const localeFiles = ["messages.en.json", "messages.zh-Hans.json"] as const;

function linkLocale(fileName: (typeof localeFiles)[number]): void {
  const linkPath = join(localesDir, fileName);
  const targetPath = join(sourceDir, fileName);

  if (!existsSync(targetPath)) {
    throw new Error(
      `Locale source not found at ${targetPath}. Run "bun run setup" to initialize submodules.`,
    );
  }

  const relativeTarget = relative(join(linkPath, ".."), targetPath);

  if (existsSync(linkPath)) {
    const stats = lstatSync(linkPath);
    if (stats.isSymbolicLink()) {
      unlinkSync(linkPath);
    } else {
      throw new Error(
        `${linkPath} exists and is not a symlink. Remove it manually before linking locales.`,
      );
    }
  }

  symlinkSync(relativeTarget, linkPath);
  console.log(`Linked ${linkPath} -> ${relativeTarget}`);
}

for (const fileName of localeFiles) {
  linkLocale(fileName);
}
