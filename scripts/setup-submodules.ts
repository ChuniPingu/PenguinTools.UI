import { $ } from "bun";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "..");

console.log("Initializing PenguinTools submodule...");
await $`git -C ${projectRoot} submodule update --init external/PenguinTools`;

const penguinToolsRoot = join(projectRoot, "external", "PenguinTools");
console.log("Initializing nested SonicAudioTools submodule...");
await $`git -C ${penguinToolsRoot} submodule update --init External/SonicAudioTools`;

console.log("Initializing nested vgaudio submodule...");
await $`git -C ${penguinToolsRoot} submodule update --init External/vgaudio`;

console.log("Submodules are ready.");

console.log("Linking locale files...");
await $`bun ${join(projectRoot, "scripts", "link-locales.ts")}`;
