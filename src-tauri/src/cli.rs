use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::process::capture_cli_output;
use crate::runtime::{RuntimeInfo, RuntimeLayout, ensure_runtime, runtime_info};
use crate::tasks::{CliTaskState, TaskEvent, TaskStartError};

const USER_ASSETS_FILE: &str = "assets.user.json";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliFinishedPayload {
    pub exit_code: i32,
    pub success: bool,
}

#[tauri::command]
pub fn prepare_runtime(app: AppHandle) -> Result<RuntimeInfo, String> {
    let layout = ensure_runtime(&app)?;
    Ok(runtime_info(&app, &layout, false))
}

#[tauri::command]
pub fn get_runtime_info(app: AppHandle) -> Result<RuntimeInfo, String> {
    let layout = ensure_runtime(&app)?;
    Ok(runtime_info(&app, &layout, false))
}

#[tauri::command]
pub fn get_app_info(app: AppHandle) -> Result<RuntimeInfo, String> {
    get_runtime_info(app)
}

#[tauri::command]
pub async fn get_cli_info(app: AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let layout = ensure_runtime(&app)?;
        let mut command = cli_command(&layout);
        command.arg("info");
        capture_cli_output(command, std::time::Duration::from_secs(15))
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn run_cli(
    app: AppHandle,
    args: Vec<String>,
    state: State<'_, CliTaskState>,
) -> Result<(), TaskStartError> {
    let event_app = app.clone();
    state.start_command(
        &app,
        "legacy".into(),
        "legacy".into(),
        args,
        move |event| match event {
            TaskEvent::Output { line } => {
                let _ = event_app.emit("cli://output", line);
            }
            TaskEvent::Stderr { line } => {
                let payload = serde_json::json!({ "type": "stderr", "message": line });
                let _ = event_app.emit("cli://output", payload.to_string());
            }
            TaskEvent::Finished { exit_code } => {
                let _ = event_app.emit(
                    "cli://finished",
                    CliFinishedPayload {
                        exit_code,
                        success: exit_code == 0,
                    },
                );
            }
        },
    )
}

#[tauri::command]
pub fn cancel_cli(state: State<'_, CliTaskState>) -> Result<(), String> {
    state.cancel("legacy")
}

#[tauri::command]
pub fn read_text_file(app: AppHandle, path: String) -> Result<String, String> {
    let layout = ensure_runtime(&app)?;
    let resolved = resolve_readable_path(&layout, &path)?;
    std::fs::read_to_string(&resolved)
        .map_err(|error| format!("Failed to read '{}': {error}", resolved.display()))
}

#[tauri::command]
pub fn write_text_file(app: AppHandle, path: String, contents: String) -> Result<(), String> {
    let layout = ensure_runtime(&app)?;
    let resolved = resolve_writable_path(&layout, &path)?;
    if let Some(parent) = resolved.parent() {
        std::fs::create_dir_all(parent).map_err(|error| {
            format!("Failed to create directory '{}': {error}", parent.display())
        })?;
    }
    std::fs::write(&resolved, contents)
        .map_err(|error| format!("Failed to write '{}': {error}", resolved.display()))
}

#[tauri::command]
pub fn path_exists(app: AppHandle, path: String) -> Result<bool, String> {
    let layout = ensure_runtime(&app)?;
    path_exists_in_layout(&layout, &path)
}

fn path_exists_in_layout(layout: &RuntimeLayout, path: &str) -> Result<bool, String> {
    // Onboarding checks the user's game directory outside app data. This
    // metadata-only command does not grant permission to read or write it.
    let candidate = Path::new(path);
    let resolved = if candidate.is_absolute() {
        candidate.to_path_buf()
    } else {
        layout.user_data_dir.join(candidate)
    };
    resolved
        .try_exists()
        .map_err(|error| format!("Failed to check '{}': {error}", resolved.display()))
}

fn resolve_readable_path(layout: &RuntimeLayout, path: &str) -> Result<PathBuf, String> {
    let resolved = resolve_path(layout, path)?;
    let allowed = [layout.user_data_dir.as_path(), layout.assets_dir.as_path()];
    if !is_under_any(&resolved, &allowed)? {
        return Err(format!(
            "Path '{}' is outside the allowed app data directories.",
            resolved.display()
        ));
    }
    Ok(resolved)
}

fn resolve_writable_path(layout: &RuntimeLayout, path: &str) -> Result<PathBuf, String> {
    let resolved = resolve_path(layout, path)?;
    if !is_under_any(&resolved, &[layout.user_data_dir.as_path()])? {
        return Err(format!(
            "Path '{}' is outside the writable user data directory.",
            resolved.display()
        ));
    }
    Ok(resolved)
}

fn resolve_path(layout: &RuntimeLayout, path: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(path);
    let absolute = if candidate.is_absolute() {
        candidate
    } else {
        layout.user_data_dir.join(candidate)
    };
    canonicalize_destination(&absolute)
        .map_err(|error| format!("Failed to resolve '{}': {error}", absolute.display()))
}

// A new file has no canonical path yet; resolve its existing ancestors instead.
// This also resolves junctions/symlinks before applying the directory boundary.
pub(crate) fn canonicalize_destination(path: &Path) -> std::io::Result<PathBuf> {
    match std::fs::canonicalize(path) {
        Ok(resolved) => Ok(resolved),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            if std::fs::symlink_metadata(path).is_ok() {
                return Err(error); // An unresolved link is not a new file.
            }
            let name = path.file_name().ok_or_else(|| {
                std::io::Error::new(std::io::ErrorKind::InvalidInput, "Unresolvable path")
            })?;
            let parent = path.parent().ok_or_else(|| {
                std::io::Error::new(std::io::ErrorKind::InvalidInput, "Path has no parent")
            })?;
            Ok(canonicalize_destination(parent)?.join(name))
        }
        Err(error) => Err(error),
    }
}

fn is_under_any(path: &Path, roots: &[&Path]) -> Result<bool, String> {
    for root in roots {
        let root = std::fs::canonicalize(root).map_err(|error| error.to_string())?;
        if path.starts_with(root) {
            return Ok(true);
        }
    }
    Ok(false)
}

pub(crate) fn inject_user_assets_arg(layout: &RuntimeLayout, args: Vec<String>) -> Vec<String> {
    if is_assets_collect(&args) {
        return args;
    }
    if args.iter().any(|arg| arg == "--user-assets") {
        return args;
    }
    let user_assets = layout.user_data_dir.join(USER_ASSETS_FILE);
    if !user_assets.is_file() {
        return args;
    }
    let mut injected = Vec::with_capacity(args.len() + 2);
    injected.push("--user-assets".to_string());
    injected.push(user_assets.display().to_string());
    injected.extend(args);
    injected
}

fn is_assets_collect(args: &[String]) -> bool {
    args.windows(2)
        .any(|pair| pair[0] == "assets" && pair[1] == "collect")
}

pub(crate) fn cli_command(layout: &RuntimeLayout) -> Command {
    let mut command = Command::new(&layout.cli_exe);
    command
        .env("PENGUIN_TOOLS_ASSETS_PATH", &layout.assets_dir)
        .env("PENGUIN_TOOLS_TEMP", &layout.temp_dir);
    command
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct Fixture(RuntimeLayout);
    impl Fixture {
        fn new() -> Self {
            let stamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let root =
                std::env::temp_dir().join(format!("penguin-paths-{}-{stamp}", std::process::id()));
            let user_data_dir = root.join("user");
            let assets_dir = root.join("assets");
            fs::create_dir_all(&user_data_dir).unwrap();
            fs::create_dir_all(&assets_dir).unwrap();
            Self(RuntimeLayout {
                cli_exe: root.join("cli"),
                temp_dir: root.join("temp"),
                root,
                user_data_dir,
                assets_dir,
            })
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.0.root).unwrap();
        }
    }

    #[test]
    fn allows_existing_and_new_files_within_user_data() {
        let fixture = Fixture::new();
        let layout = &fixture.0;
        fs::write(layout.user_data_dir.join("settings.json"), "{}").unwrap();
        assert_eq!(
            resolve_readable_path(layout, "settings.json").unwrap(),
            fs::canonicalize(layout.user_data_dir.join("settings.json")).unwrap()
        );
        assert_eq!(
            resolve_writable_path(layout, "nested/new.json").unwrap(),
            fs::canonicalize(&layout.user_data_dir)
                .unwrap()
                .join("nested/new.json")
        );
    }

    #[test]
    fn rejects_traversal_for_existing_and_new_targets() {
        let fixture = Fixture::new();
        fs::write(fixture.0.root.join("outside.json"), "{}").unwrap();
        for path in ["../outside.json", "../new.json", "../new-folder/new.json"] {
            assert!(resolve_readable_path(&fixture.0, path).is_err(), "{path}");
            assert!(resolve_writable_path(&fixture.0, path).is_err(), "{path}");
        }
    }

    #[test]
    fn assets_are_readable_but_not_writable() {
        let fixture = Fixture::new();
        let path = fixture.0.assets_dir.join("assets.json");
        fs::write(&path, "{}").unwrap();
        assert!(resolve_readable_path(&fixture.0, path.to_str().unwrap()).is_ok());
        assert!(resolve_writable_path(&fixture.0, path.to_str().unwrap()).is_err());
    }

    #[test]
    fn existence_checks_support_external_game_directories_without_granting_read_access() {
        let fixture = Fixture::new();
        let game = fixture.0.root.join("game");
        fs::create_dir(&game).unwrap();
        assert!(path_exists_in_layout(&fixture.0, game.to_str().unwrap()).unwrap());
        assert!(
            !path_exists_in_layout(&fixture.0, game.join("missing").to_str().unwrap()).unwrap()
        );
        assert!(resolve_readable_path(&fixture.0, game.to_str().unwrap()).is_err());
        assert!(!path_exists_in_layout(&fixture.0, "missing.json").unwrap());
    }

    #[test]
    fn rejects_directory_links_that_escape_user_data() {
        let fixture = Fixture::new();
        let link = fixture.0.user_data_dir.join("linked");
        let outside = fixture.0.root.join("outside");
        fs::create_dir(&outside).unwrap();
        fs::write(outside.join("existing.json"), "{}").unwrap();
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let output = Command::new("cmd.exe")
                .args(["/C", "mklink", "/J"])
                .arg(&link)
                .arg(&outside)
                .creation_flags(0x0800_0000)
                .output()
                .unwrap();
            assert!(
                output.status.success(),
                "{}",
                String::from_utf8_lossy(&output.stderr)
            );
        }
        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside, &link).unwrap();
        for name in ["existing.json", "new.json"] {
            let path = link.join(name);
            assert!(resolve_readable_path(&fixture.0, path.to_str().unwrap()).is_err());
            assert!(resolve_writable_path(&fixture.0, path.to_str().unwrap()).is_err());
        }
        #[cfg(windows)]
        fs::remove_dir(&link).unwrap();
        #[cfg(unix)]
        fs::remove_file(&link).unwrap();
        assert!(outside.join("existing.json").exists());
    }
}
