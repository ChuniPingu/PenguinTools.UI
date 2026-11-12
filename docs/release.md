# Releases

Publish the Windows installer, signature, and updater manifest to [PenguinTools.UI](https://github.com/ChuniPingu/PenguinTools.UI/releases). The tag is `v<UI version>` from `tauri.conf.json`; the default title is `PenguinTools.UI v<UI version>`.

The UI bundles the pinned PenguinTools source. UI and CLI releases have independent versions and schedules. The CLI repository links to the latest UI release.

[wallbind](https://github.com/ChuniPingu/wallbind) is released separately. The UI exports wall images and bindings through the bundled CLI; users install the DLL in their game using the plugin's installation guide. UI installers and automatic updates do not install the plugin.

## Prepare a release

1. Pin the intended PenguinTools submodule revision and run the [development checks](development.md#checks).
2. Bump the UI version:

   ```powershell
   vp run bump:version -- --bump=patch
   # Use --bump=minor, --bump=major, or --version=X.Y.Z when needed.
   ```

3. Write `docs/changelog/X.Y.Z.md` using the [release notes guide](changelog.md). The bump script updates `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`. Run `cargo check --manifest-path src-tauri/Cargo.toml` to synchronize the root package version in `src-tauri/Cargo.lock`.
4. Commit the version, notes, and any submodule update, then push the commit and tag:

   ```powershell
   git add package.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json external/PenguinTools docs/changelog/X.Y.Z.md
   git commit -m "chore(release): prepare UI X.Y.Z"
   git tag -a vX.Y.Z -m "PenguinTools.UI vX.Y.Z"
   git push origin HEAD
   git push origin vX.Y.Z
   ```

## Signing and storage

Install `git` and `gh`, authenticate GitHub CLI with access to the UI repository, and configure:

| Setting                 | Source                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| Updater private key     | `.updater.key` or `TAURI_SIGNING_PRIVATE_KEY`                          |
| Key password, if used   | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`                                   |
| Object storage          | `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` |
| Optional storage region | `S3_REGION`                                                            |

For initial setup:

```powershell
vp exec tauri signer generate -w .\.updater.key --ci
```

Copy the public key from `.updater.key.pub` to `plugins.updater.pubkey` in [tauri.conf.json](../src-tauri/tauri.conf.json). Keep private keys and storage credentials local.

Installed clients trust the configured public key and check the configured updater endpoint. A key or endpoint change needs an update path for those clients.

## Publish and verify

```powershell
vp run release
```

The script builds the installer and stages the installer, signature, and `latest.json` in a GitHub draft. It uploads stable releases to the S3 mirror, writing the mirror's `latest.json` after its download files, then publishes the GitHub release. A failed attempt can be retried with `--clobber`.

The GitHub manifest downloads from the UI repository using the UI tag. The S3 manifest downloads from the existing mirror using the same UI version. Drafts and prereleases are published only to GitHub; they do not advance the stable S3 updater.

Verify the UI release downloads and the S3 updater manifest. The manifest version must match the UI version, and its installer URL must be available.

| Flag                                 | Behavior                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `--repository=owner/repo`            | Select the UI repository; defaults to `ChuniPingu/PenguinTools.UI`                                    |
| `--tag=vX.Y.Z`                       | Set the tag; must match the configured UI version                                                     |
| `--title=...`                        | Override the release title                                                                            |
| `--skip-build`                       | Reuse existing NSIS artifacts for this UI version                                                     |
| `--skip-s3`                          | Publish to GitHub only; installed clients using S3 receive updates when that mirror is next published |
| `--clobber`                          | Replace existing GitHub release assets                                                                |
| `--draft`                            | Prepare or update a draft                                                                             |
| `--prerelease`                       | Publish or update a prerelease                                                                        |
| `--notes-file=path` or `--notes=...` | Override the UI changelog file                                                                        |

Pass flags after `--`, for example `vp run release -- --skip-build --clobber`. Rerun a prepared draft without `--draft` to publish it.

## Build output

`vp run tauri:build` builds the Windows installer with an updater signing key. Its build hook stages the CLI and builds the frontend.

```text
src-tauri/target/release/bundle/nsis/*-setup.exe
src-tauri/target/release/bundle/nsis/*-setup.exe.sig
artifacts/release/v<UI version>/latest.json
artifacts/release/v<UI version>/s3/latest.json
```

The S3 key prefix comes from the first updater endpoint, removing `/latest.json`:

```text
<prefix>/latest.json
<prefix>/v<UI version>/PenguinTools_<UI version>_x64-setup.exe
<prefix>/v<UI version>/PenguinTools_<UI version>_x64-setup.exe.sig
```

See [application architecture](architecture.md#runtime-files) for the installed runtime layout.
