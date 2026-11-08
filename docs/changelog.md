# Release notes

Each UI release has one `docs/changelog/X.Y.Z.md` file. Its filename matches `version` in [tauri.conf.json](../src-tauri/tauri.conf.json), without the tag's `v` prefix.

The release script copies UI notes into the UI GitHub release and updater manifests. Write notes for people downloading or updating the desktop app.

## Write from the release history

After choosing the version and before running `vp run release`:

1. Read the current version and find the previous `v*` release tag.
2. Review `git log --oneline vPREV..HEAD` and the relevant diff. For an existing new tag, use `vPREV..vX.Y.Z`.
3. Write the user-visible changes in `docs/changelog/X.Y.Z.md`.

Describe only changes supported by that history. Combine related commits and omit version bumps, formatting, dependency maintenance, and release plumbing unless they change user behavior.

## Style

Use a short paragraph or a few bullets under `What's new`, `Improvements`, `Changes`, or `Fixes`. Omit empty sections and trailing periods on bullets. Lead with the behavior a user will notice.

```markdown
## Fixes

- Hide the console window when the app starts the CLI
- Keep preview panes scrollable after resizing
```

Keep private repository links, commit SHAs, ticket IDs, internal implementation paths, signing details, storage settings, and credentials out of the notes. Omit "Full Changelog" boilerplate.

Published notes record historical behavior. Correct typos or unclear wording without adding changes from later releases.

The release script rejects missing or empty notes. Use `--notes-file` or `--notes` only for an intentional override; see [releases](release.md).
