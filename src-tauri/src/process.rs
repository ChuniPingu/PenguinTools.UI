use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex, mpsc};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Default)]
pub struct CliProcessState {
    cancellation: Arc<Mutex<Option<mpsc::Sender<()>>>>,
}

impl CliProcessState {
    pub fn cancel(&self) -> Result<(), String> {
        let guard = self
            .cancellation
            .lock()
            .map_err(|error| error.to_string())?;
        if let Some(sender) = guard.as_ref() {
            // Completion may have won the race with cancellation.
            let _ = sender.send(());
        }
        Ok(())
    }

    pub fn start(
        &self,
        command: Command,
        on_stdout: impl Fn(String) + Send + 'static,
        on_stderr: impl Fn(String) + Send + 'static,
        on_finished: impl FnOnce(i32) + Send + 'static,
    ) -> Result<(), String> {
        self.start_with_timeout(command, None, on_stdout, on_stderr, on_finished)
    }

    pub fn start_with_timeout(
        &self,
        mut command: Command,
        timeout: Option<Duration>,
        on_stdout: impl Fn(String) + Send + 'static,
        on_stderr: impl Fn(String) + Send + 'static,
        on_finished: impl FnOnce(i32) + Send + 'static,
    ) -> Result<(), String> {
        let mut guard = self
            .cancellation
            .lock()
            .map_err(|error| error.to_string())?;
        if guard.is_some() {
            return Err("A CLI operation is already running.".to_string());
        }
        command
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
        }
        let mut child = command
            .spawn()
            .map_err(|error| format!("Failed to start CLI: {error}"))?;
        let stdout = child.stdout.take().expect("stdout was configured as piped");
        let stderr = child.stderr.take().expect("stderr was configured as piped");
        let (sender, receiver) = mpsc::channel();
        *guard = Some(sender);
        let slot = self.cancellation.clone();

        thread::spawn(move || {
            let started = Instant::now();
            let stdout_thread = thread::spawn(move || drain_lines(stdout, on_stdout));
            let stderr_thread = thread::spawn(move || drain_lines(stderr, on_stderr));
            let mut exit_code = loop {
                match child.try_wait() {
                    Ok(Some(status)) => break status.code().unwrap_or(-1),
                    Ok(None) => {}
                    Err(_) => {
                        let _ = child.kill();
                        let _ = child.wait();
                        break -1;
                    }
                }
                let timed_out = timeout.is_some_and(|limit| started.elapsed() >= limit);
                if timed_out || receiver.recv_timeout(Duration::from_millis(25)).is_ok() {
                    match child.kill() {
                        Ok(()) => {
                            let _ = child.wait();
                            break if timed_out { 124 } else { 130 };
                        }
                        Err(_) => {
                            // The process can exit between try_wait and kill.
                            break child
                                .wait()
                                .ok()
                                .and_then(|status| status.code())
                                .unwrap_or(-1);
                        }
                    }
                }
            };
            // All result lines must be delivered before the completion event.
            let stdout_result = stdout_thread.join();
            let stderr_result = stderr_thread.join();
            if !matches!(stdout_result, Ok(Ok(()))) || !matches!(stderr_result, Ok(Ok(()))) {
                exit_code = -1;
            }
            *slot.lock().expect("CLI process lock poisoned") = None;
            on_finished(exit_code);
        });
        Ok(())
    }
}

/// Captures a short read-only query without using the foreground job's slot or events.
pub fn capture_cli_output(command: Command, timeout: Duration) -> Result<String, String> {
    let query = CliProcessState::default();
    let stdout = Arc::new(Mutex::new(String::new()));
    let stderr = Arc::new(Mutex::new(String::new()));
    let output = stdout.clone();
    let errors = stderr.clone();
    let (finished_tx, finished_rx) = mpsc::channel();
    query.start(
        command,
        move |line| {
            let mut output = output.lock().expect("CLI query output lock poisoned");
            output.push_str(&line);
            output.push('\n');
        },
        move |line| {
            let mut errors = errors.lock().expect("CLI query error lock poisoned");
            errors.push_str(&line);
            errors.push('\n');
        },
        move |code| {
            let _ = finished_tx.send(code);
        },
    )?;
    let exit_code = finished_rx.recv_timeout(timeout).map_err(|error| {
        let _ = query.cancel();
        format!("CLI info query did not finish: {error}")
    })?;
    if exit_code != 0 {
        return Err(format!(
            "CLI info query exited with code {exit_code}: {}",
            stderr.lock().expect("CLI query error lock poisoned").trim()
        ));
    }
    Ok(stdout
        .lock()
        .expect("CLI query output lock poisoned")
        .clone())
}

fn drain_lines(reader: impl Read, on_line: impl Fn(String)) -> std::io::Result<()> {
    for line in BufReader::new(reader).lines() {
        on_line(line?);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn child_fixture() {
        let Ok(mode) = std::env::var("PENGUIN_PROCESS_TEST_MODE") else {
            return;
        };
        println!("CHILD_READY");
        if mode == "wait" {
            thread::sleep(Duration::from_secs(30));
        }
        if mode == "fail" {
            eprintln!("Info fixture failed");
            std::process::exit(7);
        }
        for index in 0..100 {
            println!("RESULT_{index}");
            eprintln!("ERROR_{index}");
        }
    }

    fn command(mode: &str) -> Command {
        let mut command = Command::new(std::env::current_exe().unwrap());
        command.args(["--exact", "process::tests::child_fixture", "--nocapture"]);
        command.env("PENGUIN_PROCESS_TEST_MODE", mode);
        command
    }

    #[test]
    fn cancellation_remains_available_while_child_runs() {
        let state = CliProcessState::default();
        let (ready_tx, ready_rx) = mpsc::channel();
        let (done_tx, done_rx) = mpsc::channel();
        state
            .start(
                command("wait"),
                move |line| {
                    if line == "CHILD_READY" {
                        ready_tx.send(()).unwrap();
                    }
                },
                |_| {},
                move |code| {
                    done_tx.send(code).unwrap();
                },
            )
            .unwrap();
        ready_rx.recv_timeout(Duration::from_secs(5)).unwrap();
        assert!(
            state
                .start(command("done"), |_| {}, |_| {}, |_| {})
                .is_err()
        );
        state.cancel().unwrap();
        assert_eq!(done_rx.recv_timeout(Duration::from_secs(5)).unwrap(), 130);
    }

    #[test]
    fn read_only_queries_do_not_complete_or_cancel_the_foreground_job() {
        let state = CliProcessState::default();
        let (ready_tx, ready_rx) = mpsc::channel();
        let (done_tx, done_rx) = mpsc::channel();
        state
            .start(
                command("wait"),
                move |line| {
                    if line == "CHILD_READY" {
                        ready_tx.send(()).unwrap();
                    }
                },
                |_| {},
                move |code| {
                    done_tx.send(code).unwrap();
                },
            )
            .unwrap();
        ready_rx.recv_timeout(Duration::from_secs(5)).unwrap();

        let output = capture_cli_output(command("done"), Duration::from_secs(5)).unwrap();
        assert_eq!(
            output
                .lines()
                .filter(|line| line.starts_with("RESULT_"))
                .count(),
            100
        );
        assert!(!output.contains("ERROR_"));
        let error = capture_cli_output(command("wait"), Duration::from_millis(100)).unwrap_err();
        assert!(error.contains("did not finish"), "{error}");

        // Neither successful metadata nor its timeout releases the foreground slot.
        assert!(done_rx.try_recv().is_err());
        assert!(
            state
                .start(command("done"), |_| {}, |_| {}, |_| {})
                .is_err()
        );
        state.cancel().unwrap();
        assert_eq!(done_rx.recv_timeout(Duration::from_secs(5)).unwrap(), 130);
        assert!(capture_cli_output(command("done"), Duration::from_secs(5)).is_ok());
    }

    #[test]
    fn read_only_query_failures_are_returned_to_the_caller() {
        let error = capture_cli_output(command("fail"), Duration::from_secs(5)).unwrap_err();
        assert!(error.contains("code 7"), "{error}");
        assert!(error.contains("Info fixture failed"), "{error}");
        let missing = Command::new("penguin-cli-missing-test-executable");
        assert!(
            capture_cli_output(missing, Duration::from_secs(5))
                .unwrap_err()
                .contains("Failed to start CLI")
        );
    }

    #[test]
    fn completion_follows_all_output_and_releases_the_slot() {
        let state = CliProcessState::default();
        let (tx, rx) = mpsc::channel();
        let stdout_tx = tx.clone();
        let stderr_tx = tx.clone();
        state
            .start(
                command("done"),
                move |line| {
                    stdout_tx.send(line).unwrap();
                },
                move |line| {
                    stderr_tx.send(line).unwrap();
                },
                move |code| {
                    tx.send(format!("FINISHED_{code}")).unwrap();
                },
            )
            .unwrap();
        let mut lines = Vec::new();
        loop {
            let line = rx.recv_timeout(Duration::from_secs(5)).unwrap();
            if line == "FINISHED_0" {
                break;
            }
            lines.push(line);
        }
        assert_eq!(
            lines
                .iter()
                .filter(|line| line.starts_with("RESULT_"))
                .count(),
            100
        );
        assert_eq!(
            lines
                .iter()
                .filter(|line| line.starts_with("ERROR_"))
                .count(),
            100
        );
        let (tx, rx) = mpsc::channel();
        state
            .start(
                command("done"),
                |_| {},
                |_| {},
                move |code| {
                    tx.send(code).unwrap();
                },
            )
            .unwrap();
        assert_eq!(rx.recv_timeout(Duration::from_secs(5)).unwrap(), 0);
    }
}
