# PenguinTools.UI

Tauri desktop shell for [PenguinTools.CLI](https://github.com/Foahh/PenguinTools).

## Setup

```powershell
git clone --recurse-submodules https://github.com/Foahh/penguin-butler.git
cd penguin-butler
```

If you already cloned without submodules:

```powershell
bun run setup
```

That runs `git submodule update --init --recursive` for `external/PenguinTools` and its nested dependencies.

Install JS dependencies:

```powershell
bun install
```

### PenguinTools build prerequisites (Windows)

Building the bundled CLI also builds the `mua` media tools from `external/PenguinTools/External/mua`.

You need:

- .NET SDK 10
- Rust 1.97
- Visual Studio 2022 C++ build tools
- LLVM (`libclang.dll`) — for example: `winget install --id LLVM.LLVM -e`
- `VCPKG_ROOT` pointing at a Microsoft vcpkg checkout

Stage the CLI runtime:

```powershell
bun run stage:runtime
```

To build PenguinTools without restaging:

```powershell
bun run build:cli
```

## Development

```powershell
bun run tauri:dev
```
