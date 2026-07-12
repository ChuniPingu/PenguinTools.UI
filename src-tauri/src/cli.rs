use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::runtime::{RuntimeInfo, RuntimeLayout, ensure_runtime, runtime_info};

const USER_ASSETS_FILE: &str = "assets.user.json";

pub struct CliProcessState {
    pub child: Arc<Mutex<Option<Child>>>,
}

impl Default for CliProcessState {
    fn default() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
        }
    }
}

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
pub fn run_cli(
    app: AppHandle,
    args: Vec<String>,
    state: State<'_, CliProcessState>,
) -> Result<(), String> {
    {
        let guard = state
            .child
            .lock()
            .map_err(|_| "CLI process lock poisoned.".to_string())?;
        if guard.is_some() {
            return Err("A CLI operation is already running.".to_string());
        }
    }

    let layout = ensure_runtime(&app)?;
    spawn_cli(app, layout, args, state.child.clone())
}

#[tauri::command]
pub fn cancel_cli(state: State<'_, CliProcessState>) -> Result<(), String> {
    let mut guard = state
        .child
        .lock()
        .map_err(|_| "CLI process lock poisoned.".to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}

#[tauri::command]
pub fn read_text_file(app: AppHandle, path: String) -> Result<String, String> {
    let layout = ensure_runtime(&app)?;
    let resolved = resolve_readable_path(&layout, &path)?;
    std::fs::read_to_string(&resolved).map_err(|error| format!("Failed to read '{}': {error}", resolved.display()))
}

#[tauri::command]
pub fn write_text_file(app: AppHandle, path: String, contents: String) -> Result<(), String> {
    let layout = ensure_runtime(&app)?;
    let resolved = resolve_writable_path(&layout, &path)?;
    if let Some(parent) = resolved.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create directory '{}': {error}", parent.display()))?;
    }
    std::fs::write(&resolved, contents)
        .map_err(|error| format!("Failed to write '{}': {error}", resolved.display()))
}

#[tauri::command]
pub fn path_exists(app: AppHandle, path: String) -> Result<bool, String> {
    let layout = ensure_runtime(&app)?;
    let resolved = resolve_readable_path(&layout, &path)?;
    Ok(resolved.is_file() || resolved.is_dir())
}

fn resolve_readable_path(layout: &RuntimeLayout, path: &str) -> Result<PathBuf, String> {
    let resolved = resolve_path(layout, path);
    let allowed = [
        layout.user_data_dir.as_path(),
        layout.assets_dir.as_path(),
    ];
    if !is_under_any(&resolved, &allowed) {
        return Err(format!(
            "Path '{}' is outside the allowed app data directories.",
            resolved.display()
        ));
    }
    Ok(resolved)
}

fn resolve_writable_path(layout: &RuntimeLayout, path: &str) -> Result<PathBuf, String> {
    let resolved = resolve_path(layout, path);
    if !is_under_any(&resolved, &[layout.user_data_dir.as_path()]) {
        return Err(format!(
            "Path '{}' is outside the writable user data directory.",
            resolved.display()
        ));
    }
    Ok(resolved)
}

fn resolve_path(layout: &RuntimeLayout, path: &str) -> PathBuf {
    let candidate = PathBuf::from(path);
    if candidate.is_absolute() {
        candidate
    } else {
        layout.user_data_dir.join(candidate)
    }
}

fn is_under_any(path: &Path, roots: &[&Path]) -> bool {
    roots.iter().any(|root| path.starts_with(root))
}

fn inject_user_assets_arg(layout: &RuntimeLayout, args: Vec<String>) -> Vec<String> {
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

fn spawn_cli(
    app: AppHandle,
    layout: RuntimeLayout,
    args: Vec<String>,
    child_slot: Arc<Mutex<Option<Child>>>,
) -> Result<(), String> {
    let args = inject_user_assets_arg(&layout, args);
    let mut command = Command::new(&layout.cli_exe);
    command
        .args(&args)
        .env("PENGUIN_TOOLS_ASSETS_PATH", &layout.assets_dir)
        .env("PENGUIN_TOOLS_TEMP", &layout.temp_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to start '{}': {error}", layout.cli_exe.display()))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "CLI stdout pipe was not available.".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "CLI stderr pipe was not available.".to_string())?;

    {
        let mut guard = child_slot
            .lock()
            .map_err(|_| "CLI process lock poisoned.".to_string())?;
        *guard = Some(child);
    }

    let app_handle = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let _ = app_handle.emit("cli://output", line);
        }
    });

    let app_handle = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let _ = app_handle.emit(
                "cli://output",
                format!("{{\"type\":\"stderr\",\"message\":{}}}", json_string(&line)),
            );
        }
    });

    let app_handle = app.clone();
    std::thread::spawn(move || {
        let exit_code = {
            let mut guard = match child_slot.lock() {
                Ok(guard) => guard,
                Err(_) => {
                    let _ = app_handle.emit(
                        "cli://finished",
                        CliFinishedPayload {
                            exit_code: -1,
                            success: false,
                        },
                    );
                    return;
                }
            };
            match guard.take() {
                Some(mut child) => match child.wait() {
                    Ok(status) => status.code().unwrap_or(-1),
                    Err(_) => -1,
                },
                None => -1,
            }
        };

        let _ = app_handle.emit(
            "cli://finished",
            CliFinishedPayload {
                exit_code,
                success: exit_code == 0,
            },
        );
    });

    Ok(())
}

fn json_string(value: &str) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "\"\"".to_string())
}
