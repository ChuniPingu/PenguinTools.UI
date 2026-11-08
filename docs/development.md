# Development

## Toolchain and setup

The desktop build targets Windows x64. Install Vite+, Bun, and Rust with the MSVC target. Follow [PenguinTools' prerequisites](../external/PenguinTools/docs/development.md#windows-prerequisites) for the CLI toolchain and native tools.

UI tool versions are declared in [package.json](../package.json) and [Cargo.toml](../src-tauri/Cargo.toml). Use `vp run <name>` for project scripts in `package.json`; `vp <name>` invokes Vite+ built-ins.

Use the [README quick start](../README.md#quick-start) for initial setup. `vp run setup` checks out the pinned PenguinTools submodule and its managed codec submodules, then links the CLI translations. After pulling changes, run `vp install --frozen-lockfile`; rerun setup when the pinned submodules change.

## Build profiles

The UI aliases `aot` (default) and `fdd` select PenguinTools' `WinX64-NativeAOT` and `WinX64` profiles. See [upstream publishing](../external/PenguinTools/docs/development.md#native-tools-and-publishing) for their runtime requirements.

```powershell
vp run build:cli
vp run stage:runtime
vp run tauri:dev:fdd
```

`build:cli` publishes the CLI through upstream MSBuild targets. `stage:runtime` rebuilds it and copies the complete publish folder into `src-tauri/resources/runtime/`. See [runtime layout](architecture.md#runtime-files) for what the desktop app packages and validates.

To reuse already published binaries:

```powershell
vp run stage:runtime:skip
# For framework-dependent output:
vp run stage:runtime:skip:fdd
```

These commands still validate the payload. Rebuild after CLI or native dependency changes instead of reusing stale output.

## Checks

Run the frontend checks used by [CI](../.github/workflows/ci.yml):

```powershell
vp check
vp test --run
vp run build
```

For React changes, `vp run doctor` provides additional diagnostics. Use `vp run dev` for browser work and `vp run tauri:dev` for CLI execution, file dialogs, watchers, and runtime inspection. Keep the server and HMR ports in [vite.config.ts](../vite.config.ts) aligned with `build.devUrl` in [tauri.conf.json](../src-tauri/tauri.conf.json).

For Rust changes, run the Windows checks with packaged resources disabled, as in CI:

```powershell
$env:TAURI_CONFIG = '{"bundle":{"resources":[]}}'
cargo +stable fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo +stable clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
cargo +stable test --manifest-path src-tauri/Cargo.toml --locked --all-targets
Remove-Item Env:TAURI_CONFIG
```

## UI and translations

Follow [AGENTS.md](../AGENTS.md#ui-and-messages) for component and translation conventions. CLI descriptors are resolved by [messages.ts](../src/lib/messages.ts) through the setup-created catalog symlinks.

To repair only the locale links, preserving the current submodule checkout:

```powershell
bun scripts/link-locales.ts
```

Enable Windows Developer Mode or use a shell permitted to create symbolic links if linking fails. If the source catalogs are missing, run `vp run setup` to initialize the pinned submodules first.

## Sonar setup

The [Sonar workflow](../.github/workflows/sonar.yml) needs repository secret `SONARQUBE_USER_TOKEN` and variables `SONAR_ORGANIZATION` and `SONAR_PROJECT_KEY`. Disable automatic analysis in the Sonar project when using this workflow.

The job waits for its quality gate. Fork and Dependabot pull requests skip analysis because they lack the credential. [sonar-project.properties](../sonar-project.properties) defines the analysis scope; coverage metrics are excluded, while CI runs tests separately.

Review findings against the source. Record false-positive explanations in Sonar issues; fix valid findings in code.

## Troubleshooting

- Missing submodules: run `vp run setup`; for locale links, use [translation setup](#ui-and-translations)
- Native tool download or hash failures: see [PenguinTools setup](../external/PenguinTools/docs/development.md#windows-prerequisites)
- Missing or invalid CLI/media binaries: run `vp run stage:runtime`
- Toolchain or package-manager problems: run `vp env doctor`
- Dev server `listen EACCES` on Windows: inspect reserved ports with `netsh interface ipv4 show excludedportrange protocol=tcp` and its `ipv6` equivalent. Choose an available port and update both Vite and Tauri as described under [checks](#checks)

For installer signing and publishing, see [releases](release.md).
