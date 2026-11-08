use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::{AppHandle, State};

use crate::cli::{canonicalize_destination, cli_command, inject_user_assets_arg};
use crate::process::CliProcessState;
use crate::runtime::ensure_runtime;

// Construct arguments here so a caller cannot enable writes (e.g. --save-config).
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
pub enum CliQuery {
    ChartInspect {
        path: String,
    },
    OptionScan {
        path: String,
        #[serde(rename = "chartFileDiscovery")]
        chart_file_discovery: Option<String>,
        #[serde(rename = "batchSize")]
        batch_size: Option<i32>,
    },
}

impl CliQuery {
    fn args(&self) -> Vec<String> {
        match self {
            Self::ChartInspect { path } => {
                vec!["chart".into(), "inspect".into(), "--".into(), path.clone()]
            }
            Self::OptionScan {
                path,
                chart_file_discovery,
                batch_size,
            } => {
                let mut args = vec!["option".into(), "scan".into()];
                if let Some(discovery) = chart_file_discovery {
                    args.extend(["--chart-file-discovery".into(), discovery.clone()]);
                }
                if let Some(size) = batch_size {
                    args.extend(["--batch-size".into(), size.to_string()]);
                }
                args.extend(["--".into(), path.clone()]);
                args
            }
        }
    }

    fn timeout(&self) -> Duration {
        Duration::from_secs(match self {
            Self::ChartInspect { .. } => 60,
            Self::OptionScan { .. } => 600,
        })
    }
}

#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TaskEvent {
    Output {
        line: String,
    },
    Stderr {
        line: String,
    },
    Finished {
        #[serde(rename = "exitCode")]
        exit_code: i32,
    },
}

#[derive(Default)]
pub struct CliTaskState {
    active: Arc<Mutex<HashMap<String, RunningTask>>>,
}

struct RunningTask {
    process: CliProcessState,
    scope: TaskScope,
}

struct TaskScope {
    page: String,
    outputs: Vec<PathBuf>,
    collects_assets: bool,
    uses_assets: bool,
}

#[derive(Debug, Serialize)]
#[serde(tag = "code", rename_all = "camelCase")]
pub enum TaskStartError {
    PageBusy,
    AssetsBusy,
    OutputConflict { path: String },
    Failed { message: String },
}

impl From<String> for TaskStartError {
    fn from(message: String) -> Self {
        Self::Failed { message }
    }
}

impl CliTaskState {
    #[cfg(test)]
    fn start(
        &self,
        id: String,
        command: Command,
        timeout: Duration,
        on_event: impl Fn(TaskEvent) + Send + Sync + 'static,
    ) -> Result<(), TaskStartError> {
        self.start_scoped(
            id.clone(),
            command,
            Some(timeout),
            TaskScope {
                page: id,
                outputs: vec![],
                collects_assets: false,
                uses_assets: true,
            },
            on_event,
        )
    }

    fn start_scoped(
        &self,
        id: String,
        command: Command,
        timeout: Option<Duration>,
        scope: TaskScope,
        on_event: impl Fn(TaskEvent) + Send + Sync + 'static,
    ) -> Result<(), TaskStartError> {
        let mut active = self.active.lock().map_err(|error| error.to_string())?;
        if active.contains_key(&id) || active.values().any(|task| task.scope.page == scope.page) {
            return Err(TaskStartError::PageBusy);
        }
        if (scope.collects_assets && active.values().any(|task| task.scope.uses_assets))
            || (scope.uses_assets && active.values().any(|task| task.scope.collects_assets))
        {
            return Err(TaskStartError::AssetsBusy);
        }
        for output in &scope.outputs {
            if active
                .values()
                .flat_map(|task| &task.scope.outputs)
                .any(|other| paths_overlap(output, other))
            {
                return Err(TaskStartError::OutputConflict {
                    path: output.display().to_string(),
                });
            }
        }
        let process = CliProcessState::default();
        let on_event = Arc::new(on_event);
        let stdout = on_event.clone();
        let stderr = on_event.clone();
        let registry = self.active.clone();
        let finished_id = id.clone();
        process.start_with_timeout(
            command,
            timeout,
            move |line| stdout(TaskEvent::Output { line }),
            move |line| stderr(TaskEvent::Stderr { line }),
            move |exit_code| {
                registry
                    .lock()
                    .expect("CLI task registry poisoned")
                    .remove(&finished_id);
                on_event(TaskEvent::Finished { exit_code });
            },
        )?;
        // The lock also orders cancellation after the process has started.
        active.insert(id, RunningTask { process, scope });
        Ok(())
    }

    pub(crate) fn cancel(&self, id: &str) -> Result<(), String> {
        if let Some(process) = self
            .active
            .lock()
            .map_err(|error| error.to_string())?
            .get(id)
        {
            process.process.cancel()?;
        }
        Ok(())
    }

    pub(crate) fn start_command(
        &self,
        app: &AppHandle,
        id: String,
        page: String,
        args: Vec<String>,
        on_event: impl Fn(TaskEvent) + Send + Sync + 'static,
    ) -> Result<(), TaskStartError> {
        let layout = ensure_runtime(app)?;
        let outputs = write_targets(&args)?;
        let collects_assets = args.first().is_some_and(|arg| arg == "assets")
            && args.get(1).is_some_and(|arg| arg == "collect");
        let uses_assets = !args.first().is_some_and(|arg| arg == "info");
        let timeout = if !uses_assets {
            Some(Duration::from_secs(15))
        } else if args.starts_with(&["chart".into(), "inspect".into()]) {
            Some(Duration::from_secs(60))
        } else {
            None
        };
        let mut command = cli_command(&layout);
        command.args(inject_user_assets_arg(&layout, args));
        self.start_scoped(
            id,
            command,
            timeout,
            TaskScope {
                page,
                outputs,
                collects_assets,
                uses_assets,
            },
            on_event,
        )
    }
}

#[tauri::command]
pub fn start_cli_query(
    app: AppHandle,
    id: String,
    page: String,
    query: CliQuery,
    events: Channel<TaskEvent>,
    state: State<'_, CliTaskState>,
) -> Result<(), TaskStartError> {
    let layout = ensure_runtime(&app)?;
    let mut command = cli_command(&layout);
    command.args(inject_user_assets_arg(&layout, query.args()));
    state.start_scoped(
        id,
        command,
        Some(query.timeout()),
        TaskScope {
            page,
            outputs: vec![],
            collects_assets: false,
            uses_assets: true,
        },
        move |event| {
            let _ = events.send(event);
        },
    )
}

#[tauri::command]
pub fn start_cli_task(
    app: AppHandle,
    id: String,
    page: String,
    args: Vec<String>,
    events: Channel<TaskEvent>,
    state: State<'_, CliTaskState>,
) -> Result<(), TaskStartError> {
    state.start_command(&app, id, page, args, move |event| {
        let _ = events.send(event);
    })
}

fn paths_overlap(left: &Path, right: &Path) -> bool {
    // Windows output paths are case insensitive, including not-yet-created children.
    let normalize = |path: &Path| {
        if cfg!(windows) {
            PathBuf::from(path.to_string_lossy().to_lowercase())
        } else {
            path.to_path_buf()
        }
    };
    let (left, right) = (normalize(left), normalize(right));
    left.starts_with(&right) || right.starts_with(&left)
}

fn write_targets(args: &[String]) -> Result<Vec<PathBuf>, String> {
    let flag = |name: &str| {
        args.windows(2)
            .find(|pair| pair[0] == name)
            .map(|pair| pair[1].as_str())
    };
    let operation: Vec<_> = args.iter().take(2).map(String::as_str).collect();
    let mut outputs = match operation.as_slice() {
        ["assets", "collect"] => vec![PathBuf::from(
            flag("--output").ok_or("Missing asset output")?,
        )],
        ["info"] | ["chart", "inspect"] | ["option", "scan"] => vec![],
        ["chart", "convert"]
        | ["chart", "extract"]
        | ["music", "build"]
        | ["music", "extract"]
        | ["option", "build"]
        | ["jacket", "convert-file"]
        | ["jacket", "convert"]
        | ["audio", "convert-file"]
        | ["audio", "convert"]
        | ["audio", "extract"]
        | ["stage", "build-files"]
        | ["stage", "build"]
        | ["stage", "extract"] => {
            vec![PathBuf::from(args.get(3).ok_or("Missing task output")?)]
        }
        _ => return Err("Unsupported page task command".into()),
    };
    if operation.first() == Some(&"option") && args.iter().any(|arg| arg == "--save-config") {
        let config = if operation.get(1) == Some(&"build") {
            flag("--config")
        } else {
            None
        };
        outputs.push(match config {
            Some(path) if !path.trim().is_empty() => PathBuf::from(path.trim()),
            _ => PathBuf::from(args.get(2).ok_or("Missing option input")?).join("options.json"),
        });
    }
    outputs
        .into_iter()
        .map(|path| {
            let absolute = std::path::absolute(path).map_err(|error| error.to_string())?;
            canonicalize_destination(&absolute).map_err(|error| error.to_string())
        })
        .collect()
}

#[tauri::command]
pub fn cancel_cli_task(id: String, state: State<'_, CliTaskState>) -> Result<(), String> {
    state.cancel(&id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    fn start_scoped_fixture(
        state: &CliTaskState,
        id: &str,
        page: &str,
        outputs: &[&str],
        collects_assets: bool,
    ) -> Result<mpsc::Receiver<TaskEvent>, TaskStartError> {
        let (tx, rx) = mpsc::channel();
        state.start_scoped(
            id.into(),
            command("wait"),
            Some(Duration::from_secs(10)),
            TaskScope {
                page: page.into(),
                outputs: outputs.iter().map(PathBuf::from).collect(),
                collects_assets,
                uses_assets: true,
            },
            move |event| {
                let _ = tx.send(event);
            },
        )?;
        Ok(rx)
    }

    fn stop_fixture(state: &CliTaskState, id: &str, rx: mpsc::Receiver<TaskEvent>) {
        state.cancel(id).unwrap();
        loop {
            if let TaskEvent::Finished { exit_code } =
                rx.recv_timeout(Duration::from_secs(5)).unwrap()
            {
                assert_eq!(exit_code, 130);
                break;
            }
        }
    }

    #[test]
    fn page_slots_and_overlapping_outputs_are_exclusive_until_native_completion() {
        let state = CliTaskState::default();
        let first = start_scoped_fixture(&state, "first", "chart", &["out"], false).unwrap();
        assert!(matches!(
            start_scoped_fixture(&state, "duplicate", "chart", &["other"], false),
            Err(TaskStartError::PageBusy)
        ));
        assert!(matches!(
            start_scoped_fixture(&state, "conflict", "song", &["out/nested/file"], false),
            Err(TaskStartError::OutputConflict { .. })
        ));
        let second = start_scoped_fixture(&state, "second", "song", &["out2"], false).unwrap();
        stop_fixture(&state, "first", first);
        let replacement =
            start_scoped_fixture(&state, "replacement", "chart", &["out/nested"], false).unwrap();
        stop_fixture(&state, "replacement", replacement);
        stop_fixture(&state, "second", second);
        assert!(state.active.lock().unwrap().is_empty());
    }

    #[test]
    fn asset_collection_is_exclusive_but_info_capture_remains_independent() {
        let state = CliTaskState::default();
        let reader = start_scoped_fixture(&state, "reader", "option", &[], false).unwrap();
        assert!(matches!(
            start_scoped_fixture(&state, "collector", "misc", &[], true),
            Err(TaskStartError::AssetsBusy)
        ));
        stop_fixture(&state, "reader", reader);
        let collector = start_scoped_fixture(&state, "collector", "misc", &[], true).unwrap();
        assert!(matches!(
            start_scoped_fixture(&state, "reader", "option", &[], false),
            Err(TaskStartError::AssetsBusy)
        ));
        let info =
            crate::process::capture_cli_output(command("done"), Duration::from_secs(5)).unwrap();
        assert!(info.contains("READY"));
        assert!(state.active.lock().unwrap().contains_key("collector"));
        stop_fixture(&state, "collector", collector);
        let reader = start_scoped_fixture(&state, "reader", "option", &[], false).unwrap();
        stop_fixture(&state, "reader", reader);
    }

    #[test]
    fn reservations_include_explicit_and_default_config_files_and_resolve_ancestors() {
        let root = std::env::temp_dir();
        let input = root.join("penguin-task-input");
        let output = root.join("penguin-task-output");
        let config = root.join("penguin-task-config.json");
        let mut args = vec![
            "option".into(),
            "build".into(),
            input.display().to_string(),
            output.display().to_string(),
            "--save-config".into(),
        ];
        let expected_output = canonicalize_destination(&output).unwrap();
        assert_eq!(
            write_targets(&args).unwrap(),
            vec![
                expected_output.clone(),
                canonicalize_destination(&input.join("options.json")).unwrap()
            ]
        );
        args.extend(["--config".into(), config.display().to_string()]);
        assert_eq!(
            write_targets(&args).unwrap(),
            vec![expected_output, canonicalize_destination(&config).unwrap()]
        );
        if cfg!(windows) {
            assert!(paths_overlap(
                Path::new("C:/Output"),
                Path::new("c:/output/child")
            ));
        }
        assert!(!paths_overlap(Path::new("out"), Path::new("out2")));
    }

    #[test]
    fn query_child_fixture() {
        let Ok(mode) = std::env::var("PENGUIN_QUERY_TEST_MODE") else {
            return;
        };
        println!("READY");
        if mode == "wait" {
            std::thread::sleep(Duration::from_secs(30));
        }
    }

    fn command(mode: &str) -> Command {
        let mut command = Command::new(std::env::current_exe().unwrap());
        command.args([
            "--exact",
            "tasks::tests::query_child_fixture",
            "--nocapture",
        ]);
        command.env("PENGUIN_QUERY_TEST_MODE", mode);
        command
    }

    #[test]
    fn concurrent_queries_have_separate_output_cancellation_and_completion() {
        let state = CliTaskState::default();
        let (tx, rx) = mpsc::channel();
        for id in ["first", "second"] {
            let tx = tx.clone();
            state
                .start(
                    id.into(),
                    command("wait"),
                    Duration::from_secs(10),
                    move |event| {
                        tx.send((id, event)).unwrap();
                    },
                )
                .unwrap();
        }
        let mut ready = 0;
        while ready < 2 {
            if matches!(rx.recv_timeout(Duration::from_secs(5)).unwrap().1, TaskEvent::Output { line } if line == "READY")
            {
                ready += 1;
            }
        }
        assert!(
            state
                .start(
                    "second".into(),
                    command("done"),
                    Duration::from_secs(5),
                    |_| {}
                )
                .is_err()
        );
        state.cancel("first").unwrap();
        loop {
            let (id, event) = rx.recv_timeout(Duration::from_secs(5)).unwrap();
            if let TaskEvent::Finished { exit_code } = event {
                assert_eq!(id, "first");
                assert_eq!(exit_code, 130);
                break;
            }
        }
        assert!(state.active.lock().unwrap().contains_key("second"));
        state.cancel("second").unwrap();
        loop {
            if let ("second", TaskEvent::Finished { exit_code }) =
                rx.recv_timeout(Duration::from_secs(5)).unwrap()
            {
                assert_eq!(exit_code, 130);
                break;
            }
        }
        assert!(state.active.lock().unwrap().is_empty());
    }

    #[test]
    fn timeout_and_launch_failure_release_query_ids() {
        let state = CliTaskState::default();
        assert!(
            state
                .start(
                    "query".into(),
                    Command::new("missing-query-fixture"),
                    Duration::from_secs(1),
                    |_| {}
                )
                .is_err()
        );
        let (tx, rx) = mpsc::channel();
        state
            .start(
                "query".into(),
                command("wait"),
                Duration::from_millis(100),
                move |event| {
                    if let TaskEvent::Finished { exit_code } = event {
                        tx.send(exit_code).unwrap();
                    }
                },
            )
            .unwrap();
        assert_eq!(rx.recv_timeout(Duration::from_secs(5)).unwrap(), 124);
        assert!(state.active.lock().unwrap().is_empty());
    }

    #[test]
    fn query_contract_rejects_write_commands_and_options() {
        for value in [
            serde_json::json!({"kind":"optionBuild", "path":"input"}),
            serde_json::json!({"kind":"optionScan", "path":"input", "saveConfig":true}),
            serde_json::json!({"kind":"chartInspect", "path":"input", "args":["--output", "target"]}),
        ] {
            assert!(serde_json::from_value::<CliQuery>(value).is_err());
        }
    }

    #[test]
    fn paths_are_positional_and_scan_options_cannot_enable_writes() {
        let query: CliQuery = serde_json::from_value(serde_json::json!({
            "kind":"optionScan", "path":"--save-config", "chartFileDiscovery":"ugc,mgxc", "batchSize":2,
        })).unwrap();
        assert_eq!(
            query.args(),
            [
                "option",
                "scan",
                "--chart-file-discovery",
                "ugc,mgxc",
                "--batch-size",
                "2",
                "--",
                "--save-config"
            ]
        );
        let inspect = CliQuery::ChartInspect {
            path: "--help".into(),
        };
        assert_eq!(inspect.args(), ["chart", "inspect", "--", "--help"]);
    }
}
