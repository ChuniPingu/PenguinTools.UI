# Application architecture

The React frontend collects settings and presents results. Tauri owns native file access, process management, and file watching. PenguinTools performs conversion and asset operations.

| Area                                           | Responsibility                                                  |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `src/pages/` and `src/components/`             | Tool screens and reusable UI primitives                         |
| `src/stores/`                                  | Tool settings and CLI output state                              |
| `src/lib/cli-commands.ts` and `cli-results.ts` | CLI arguments and result interpretation                         |
| `src/lib/cli-task.ts` and `tauri-cli.ts`       | Task channels, metadata queries, and native API calls           |
| `src/lib/page-tasks.ts`                        | Persistent page tasks, concurrency, and asset collection gating |
| `src/lib/messages.ts`                          | Resolve structured CLI messages through translation catalogs    |
| `src-tauri/src/tasks.rs` and `process.rs`      | Reserve task resources, stream output, and handle cancellation  |
| `src-tauri/src/watch.rs`                       | Native file watchers                                            |
| `src-tauri/src/runtime.rs`                     | Locate and validate runtime files and writable data directories |
| `scripts/build-cli.ts` and `stage-runtime.ts`  | Publish and stage the CLI payload                               |
| `external/PenguinTools/`                       | Pinned CLI source and dependencies                              |

## CLI integration

The option export page builds songs with all discovered difficulties and media. A folder containing one song uses the same workflow. Individual chart and media tools handle standalone conversions.

Changes to CLI arguments, JSON results, diagnostics, or cancellation behavior need matching changes in the frontend bridge and its tests. The upstream [CLI guide](../external/PenguinTools/docs/cli.md#json-output-and-scripts) owns the output protocol; [chart conversion](../external/PenguinTools/docs/chart-conversion.md) owns supported editor versions and round-trip rules.

Backend message catalogs are shared through symlinks; UI catalogs belong to this repository. See [translation setup](development.md#ui-and-translations).

For missing-asset diagnostics, the UI uses the message key and catalog argument to link to the matching Assets tab and close the diagnostics dialog.

The diagnostics dialog uses a selectable table and an inspector. Its source header contains only the file path; musical positions belong to note or segment rows, and text line numbers accompany source excerpts. Compact musical positions expose the complete bar, beat, and tick offset in a tooltip. Diagnostic titles come from `titles.<message.key>` in the backend message catalogs, with the original message as the fallback. The original message supplies the explanation; identical title/explanation text is displayed once. Known structured targets have dedicated views; missing or unknown target shapes retain the translated message and available location. The complete selected payload remains under Technical details and in Copy diagnostic. Copy location includes the source path and available position, or copies only the path when there is no position.

## File dialogs

Each file picker has a stable history key and GUID in `src/lib/file-picker.ts`, including separate input/output identities and individual stage-effect slots. On Windows, `src-tauri/src/file_dialog.rs` creates an owned native dialog on a dedicated COM STA thread and calls `IFileDialog::SetClientGuid` before configuring it. Windows persists each dialog's location and state across application restarts. Existing GUIDs must not be regenerated or reassigned.

Suggested paths use `SetDefaultFolder`, so Windows history takes precedence; unavailable suggestions fall back to an existing ancestor. Save dialogs receive only the suggested basename through `SetFileName`, preserving the current output name without overriding the remembered directory. Other platforms use the Tauri dialog plugin.

## Runtime files

Tauri packages the staged directory as `runtime/`:

```text
<install>/
  penguin-tools.exe
  runtime/
    PenguinTools.CLI.exe
    assets/
      texconv/texconv.exe
      ffmpeg/ffmpeg.exe
      image-tools/
        image-tools.exe
        libvips-42.dll
        licenses/
    <managed dependencies and runtime configuration for the fdd profile>
```

The CLI runs from the runtime directory. Writable `user-data/` and `temp/` directories live under the OS app-local-data directory. Startup validates the required CLI and native binaries in [runtime.rs](../src-tauri/src/runtime.rs).

Runtime assets are build output. Recreate them with the [staging commands](development.md#build-profiles).

For installer signing, updater configuration, and publishing, see [releases](release.md).
