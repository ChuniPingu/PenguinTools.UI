use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use notify::event::{CreateKind, ModifyKind, RenameMode};
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, State};

const TRACKED_PATH_CHANGED_EVENT: &str = "tracked-path://changed";

pub struct FileWatchState {
    inner: Mutex<Option<WatchSession>>,
}

struct WatchSession {
    stop_tx: Sender<()>,
    thread: Option<JoinHandle<()>>,
}

impl Default for FileWatchState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('/', "\\").to_lowercase()
}

fn is_tracked_path(path: &Path, tracked_paths: &[String]) -> bool {
    let normalized = normalize_path(path);
    tracked_paths.iter().any(|tracked_path| tracked_path == &normalized)
}

fn is_relevant_file_event(event: &Event) -> bool {
    matches!(
        event.kind,
        EventKind::Modify(ModifyKind::Data(_))
            | EventKind::Modify(ModifyKind::Metadata(_))
            | EventKind::Modify(ModifyKind::Name(RenameMode::Any))
            | EventKind::Create(CreateKind::File)
            | EventKind::Create(CreateKind::Any)
    )
}

fn stop_session(session: WatchSession) {
    let _ = session.stop_tx.send(());
    if let Some(thread) = session.thread {
        let _ = thread.join();
    }
}

fn stop_watch(state: &FileWatchState) -> Result<(), String> {
    let mut guard = state
        .inner
        .lock()
        .map_err(|_| "File watch lock poisoned.".to_string())?;

    if let Some(session) = guard.take() {
        stop_session(session);
    }

    Ok(())
}

fn watch_loop(
    app: AppHandle,
    watch_root: PathBuf,
    recursive: bool,
    tracked_paths: Arc<Vec<String>>,
    stop_rx: Receiver<()>,
) {
    let (event_tx, event_rx) = mpsc::channel();

    let mut watcher = match RecommendedWatcher::new(
        move |result| {
            let _ = event_tx.send(result);
        },
        Config::default(),
    ) {
        Ok(watcher) => watcher,
        Err(_) => return,
    };

    let watch_target = if watch_root.is_file() {
        watch_root
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| watch_root.clone())
    } else {
        watch_root.clone()
    };

    if watcher
        .watch(
            watch_target.as_path(),
            if recursive {
                RecursiveMode::Recursive
            } else {
                RecursiveMode::NonRecursive
            },
        )
        .is_err()
    {
        return;
    }

    loop {
        if stop_rx.try_recv().is_ok() {
            break;
        }

        match event_rx.recv_timeout(Duration::from_millis(200)) {
            Ok(Ok(event)) => {
                if !is_relevant_file_event(&event) {
                    continue;
                }

                for path in event.paths {
                    if is_tracked_path(&path, tracked_paths.as_ref()) {
                        let _ = app.emit(
                            TRACKED_PATH_CHANGED_EVENT,
                            path.to_string_lossy().to_string(),
                        );
                    }
                }
            }
            Ok(Err(_)) | Err(mpsc::RecvTimeoutError::Disconnected) => break,
            Err(mpsc::RecvTimeoutError::Timeout) => {}
        }
    }

    let _ = watcher.unwatch(watch_target.as_path());
}

#[tauri::command]
pub fn start_tracked_path_watch(
    app: AppHandle,
    state: State<'_, FileWatchState>,
    watch_path: String,
    tracked_paths: Vec<String>,
) -> Result<(), String> {
    stop_watch(&state)?;

    let watch_path_buf = PathBuf::from(watch_path.trim());
    if watch_path_buf.as_os_str().is_empty() {
        return Ok(());
    }

    if !watch_path_buf.exists() {
        return Err("Watch path does not exist.".to_string());
    }

    let tracked = if tracked_paths.is_empty() {
        if watch_path_buf.is_file() {
            vec![normalize_path(&watch_path_buf)]
        } else {
            return Ok(());
        }
    } else {
        tracked_paths
            .into_iter()
            .map(|path| normalize_path(Path::new(&path)))
            .collect::<Vec<_>>()
    };

    if tracked.is_empty() {
        return Ok(());
    }

    let recursive = watch_path_buf.is_dir();
    let tracked_paths = Arc::new(tracked);
    let (stop_tx, stop_rx) = mpsc::channel();
    let app_handle = app.clone();

    let thread = thread::spawn(move || {
        watch_loop(
            app_handle,
            watch_path_buf,
            recursive,
            tracked_paths,
            stop_rx,
        );
    });

    let mut guard = state
        .inner
        .lock()
        .map_err(|_| "File watch lock poisoned.".to_string())?;
    *guard = Some(WatchSession {
        stop_tx,
        thread: Some(thread),
    });

    Ok(())
}

#[tauri::command]
pub fn stop_tracked_path_watch(state: State<'_, FileWatchState>) -> Result<(), String> {
    stop_watch(&state)
}

#[tauri::command]
pub fn start_option_chart_watch(
    app: AppHandle,
    state: State<'_, FileWatchState>,
    option_path: String,
    chart_paths: Vec<String>,
) -> Result<(), String> {
    start_tracked_path_watch(app, state, option_path, chart_paths)
}

#[tauri::command]
pub fn stop_option_chart_watch(state: State<'_, FileWatchState>) -> Result<(), String> {
    stop_tracked_path_watch(state)
}
