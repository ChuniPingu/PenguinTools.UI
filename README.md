# PenguinTools.UI

Windows desktop app for converting CHUNITHM charts, music, jackets, and stages with [PenguinTools](https://github.com/ChuniPingu/PenguinTools).

[下载图形界面 / Download the desktop app](https://github.com/ChuniPingu/PenguinTools.UI/releases/latest)

## Prerequisites

- Git, Vite+, and Bun
- Rust with the Windows MSVC target, .NET SDK, and Visual Studio C++ build tools

Use the tool versions recorded in repository configuration. See [development setup](docs/development.md) for native build requirements.

## Quick start

```powershell
git clone --recurse-submodules https://github.com/ChuniPingu/PenguinTools.UI.git
cd PenguinTools.UI
vp install
vp run setup
vp run tauri:dev
```

Setup initializes submodules and links the CLI translations. The first desktop launch builds and stages the CLI runtime.

## Common commands

| Command                      | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `vp run dev`                 | Start the frontend dev server                           |
| `vp run tauri:dev`           | Build the CLI runtime and launch the desktop app        |
| `vp run stage:runtime`       | Rebuild and stage the bundled CLI                       |
| `vp run build`               | Type-check and build the frontend                       |
| `vp check` / `vp test --run` | Run frontend checks and tests                           |
| `vp run tauri:build`         | Build the Windows installer with an updater signing key |

## Documentation

- [Development, checks, and troubleshooting](docs/development.md)
- [Application architecture and runtime](docs/architecture.md)
- [Releases](docs/release.md)
- [Writing release notes](docs/changelog.md)

Licensed under the [MIT license](LICENSE).
