# PenguinTools.UI guidance

Use `vpx` for standalone TypeScript scripts.

After a full React Doctor scan, use subagents as needed to triage independent components. Group findings with a shared cause and verify the combined result once.

- Keep credentials and private implementation details out of public source and artifacts. Release notes are public; omit private repository links and internal release configuration.
- Publish UI binaries to the UI repository and the S3 mirror as described in [releases](docs/release.md).
- `external/PenguinTools/` is a separate repository. Change its source or submodule reference when the task needs it, and follow its [guidance](external/PenguinTools/AGENTS.md).

## Documentation

- Update docs when usage, public contracts, prerequisites, or lasting architecture constraints change. Revise existing passages; keep one primary location per fact. Put investigation and validation notes in PRs or commits.
- Keep READMEs to overview, prerequisites, quick start, common commands, and links. Tool and library versions belong in configuration.
- Use [architecture](docs/architecture.md) for runtime and CLI boundaries, [development](docs/development.md) for setup and checks, [releases](docs/release.md) for publishing, and [release notes](docs/changelog.md) for changelog conventions.

## UI and messages

- Use Base UI primitives with `render` and `mergeProps`, following `src/components/ui/`.
- Use `useTranslation()` with `ui.*` keys for UI text and `resolveMessage()` for CLI `MessageDescriptor` payloads. Add keys to both language catalogs.
- Keep UI-authored toast messages in each feature's `notify` group, such as `ui.tasks.notify.failed`; use `ui.common.notify` for shared messages. Give inline text its own key when both uses need similar wording.
- Edit backend catalogs in `external/PenguinTools/locales/`. See [locale setup](docs/development.md#ui-and-translations) for repairing their symlinks under `src/locales/`.
- Use `ui.properties.<field>.description` for every tooltip for that field.
- In `ui.zh-Hans.json`, end field descriptions and messages in `notify` groups with `。`; omit it on other strings.
