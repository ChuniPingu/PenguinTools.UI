import { $ } from "bun";
import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "..");
const penguinToolsRoot = join(projectRoot, "external", "PenguinTools");
const muaRoot = join(penguinToolsRoot, "External", "mua");
const muaPublishRoot = join(muaRoot, "target", "release", "mua");
const criProject = join(penguinToolsRoot, "PenguinTools.CRI", "PenguinTools.CRI.csproj");
const publishProfile = "WinX64-SelfContained-SingleFile";
const publishRoot = join(
  penguinToolsRoot,
  "PenguinTools.CLI",
  "bin",
  "Release",
  "net10.0",
  "publish",
  publishProfile,
);
const muaAssetsRoot = join(publishRoot, "assets", "mua");
const criAssetsRoot = join(publishRoot, "assets", "cri");
const requiredMuaBinaries = ["mua_wav.exe", "mua_img.exe"];
const criBinary = "PenguinTools.CRI.exe";

function ensureSubmodule(root: string, label: string): void {
  if (existsSync(join(root, ".git"))) {
    return;
  }

  throw new Error(
    `${label} is missing at '${root}'.\n\nRun from the project root:\n  bun run setup`,
  );
}

function ensureBuildPrerequisites(): void {
  if (!process.env.VCPKG_ROOT || !existsSync(join(process.env.VCPKG_ROOT, "vcpkg.exe"))) {
    throw new Error(
      "VCPKG_ROOT must point to a Microsoft vcpkg checkout containing vcpkg.exe.\n\nExample:\n  setx VCPKG_ROOT D:\\vcpkg",
    );
  }

  const libclangCandidates = [
    process.env.LIBCLANG_PATH ? join(process.env.LIBCLANG_PATH, "libclang.dll") : null,
    "C:\\Program Files\\LLVM\\bin\\libclang.dll",
    "C:\\Program Files (x86)\\LLVM\\bin\\libclang.dll",
  ].filter((value): value is string => value != null);

  if (!libclangCandidates.some((path) => existsSync(path))) {
    throw new Error(
      "libclang.dll was not found.\n\nInstall LLVM and ensure LIBCLANG_PATH points to its bin directory, for example:\n  winget install --id LLVM.LLVM -e",
    );
  }
}

function assertMuaPublishOutput(): void {
  if (!existsSync(muaPublishRoot) || !statSync(muaPublishRoot).isDirectory()) {
    throw new Error(
      `mua publish output was not found at '${muaPublishRoot}'.\n\nBuild mua first:\n  cd external/PenguinTools/External/mua\n  .\\scripts\\build.ps1`,
    );
  }

  for (const binary of requiredMuaBinaries) {
    const path = join(muaPublishRoot, binary);
    if (!existsSync(path) || !statSync(path).isFile()) {
      throw new Error(`mua binary '${binary}' was not found at '${path}'.`);
    }
  }
}

function assertPublishedAssets(): void {
  for (const binary of requiredMuaBinaries) {
    const path = join(muaAssetsRoot, binary);
    if (!existsSync(path) || !statSync(path).isFile()) {
      throw new Error(
        `Published runtime asset '${binary}' was not found at '${path}'.\n\nRepublish PenguinTools.CLI after building mua.`,
      );
    }
  }

  const criPath = join(criAssetsRoot, criBinary);
  if (!existsSync(criPath) || !statSync(criPath).isFile()) {
    throw new Error(
      `Published runtime asset '${criBinary}' was not found at '${criPath}'.\n\nRepublish PenguinTools.CLI after publishing PenguinTools.CRI.`,
    );
  }
}

ensureSubmodule(penguinToolsRoot, "PenguinTools submodule");
ensureSubmodule(muaRoot, "mua submodule");
ensureSubmodule(join(penguinToolsRoot, "External", "SonicAudioTools"), "SonicAudioTools submodule");
ensureSubmodule(join(penguinToolsRoot, "External", "vgaudio"), "vgaudio submodule");
ensureBuildPrerequisites();

console.log("Building mua media tools...");
await $`powershell -NoProfile -ExecutionPolicy Bypass -File ${join(muaRoot, "scripts", "build.ps1")}`;
assertMuaPublishOutput();

console.log("Restoring PenguinTools...");
await $`dotnet restore PenguinTools.slnx`.cwd(penguinToolsRoot);

console.log("Publishing PenguinTools.CRI...");
await $`dotnet publish ${criProject} -p:PublishProfile=${publishProfile} /p:DebugType=None /p:DebugSymbols=false`.cwd(
  penguinToolsRoot,
);

console.log("Publishing PenguinTools.CLI...");
await $`dotnet publish PenguinTools.CLI/PenguinTools.CLI.csproj -p:PublishProfile=${publishProfile} /p:DebugType=None /p:DebugSymbols=false`.cwd(
  penguinToolsRoot,
);

assertPublishedAssets();

console.log(`PenguinTools publish ready at ${publishRoot}`);
