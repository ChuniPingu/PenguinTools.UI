# Release, installers, and auto-update

## Publish installer

```powershell
bun run tauri:build
```

Output (Windows NSIS):

```text
src-tauri/target/release/bundle/nsis/*-setup.exe
src-tauri/target/release/bundle/nsis/*-setup.exe.sig
```

Installed layout:

```text
<install>/
  penguin-tools.exe
  runtime/
    PenguinTools.CLI.exe
    assets/
```

The CLI runs in place from `runtime/`; it is no longer copied into app local data. Writable state stays under the OS app-data folder (`user-data/`, `temp/`).

## Auto-update (R2)

Production builds check:

```text
https://releases.foahh.com/penguin-tools/latest.json
```

Point your Cloudflare R2 public base (custom domain or `*.r2.dev`) at that URL path. The GitHub secret `R2_PUBLIC_BASE` must match the same origin+prefix (no trailing slash), for example:

```text
https://releases.foahh.com/penguin-tools
```

Bucket layout after a release:

```text
/latest.json
/v2.0.1/penguin-tools_2.0.1_x64-setup.exe
/v2.0.1/penguin-tools_2.0.1_x64-setup.exe.sig
```

### Updater signing keys

Generate once (do not commit the private key):

```powershell
bunx tauri signer generate -w .\.updater-private.key --ci -f
```

1. Put the **public** key contents into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey` (already set for the keypair created with this repo).
2. Store the **private** key file contents as the GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY`.
3. If you used a password, set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (otherwise leave it empty).

If you regenerate keys, update both the public key in `tauri.conf.json` and the private key secret together — otherwise installed clients cannot verify new updates.

Local `.updater-private.key` / `.updater-public.key` are gitignored.

### Required GitHub secrets

| Secret                               | Purpose                                                |
| ------------------------------------ | ------------------------------------------------------ |
| `TAURI_SIGNING_PRIVATE_KEY`          | Signs updater artifacts                                |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Key password (empty if none)                           |
| `R2_ACCOUNT_ID`                      | Cloudflare account id for the S3 API endpoint          |
| `R2_ACCESS_KEY_ID`                   | R2 API token access key                                |
| `R2_SECRET_ACCESS_KEY`               | R2 API token secret                                    |
| `R2_BUCKET`                          | Target bucket name                                     |
| `R2_PUBLIC_BASE`                     | Public HTTPS base (must match updater endpoint prefix) |

## Version bump and release

1. Run **Actions → Version bump** (`workflow_dispatch`) and choose `patch` / `minor` / `major`.
2. The workflow updates `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`, commits `chore: release vX.Y.Z`, and pushes tag `vX.Y.Z`.
3. Tag push runs **Release**: builds the Windows NSIS installer, creates a GitHub Release, uploads artifacts to R2, and publishes rewritten `latest.json`.

Local bump (does not tag/push):

```powershell
bun run bump:version -- --bump=patch
```
