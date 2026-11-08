use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Manager, State, Theme, window::Color};

#[derive(Default)]
pub struct StartupState(AtomicBool);

#[tauri::command]
pub fn show_main_window(
    app: AppHandle,
    state: State<'_, StartupState>,
    dark: Option<bool>,
) -> Result<(), String> {
    // React StrictMode and the native timeout may both request the reveal.
    if state.0.swap(true, Ordering::Relaxed) {
        return Ok(());
    }

    let result = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window is unavailable".to_owned())
        .and_then(|window| {
            let dark = dark.unwrap_or_else(|| matches!(window.theme(), Ok(Theme::Dark)));
            // Match the page background while WebView2 composites its first frame.
            let background = if dark {
                Color(12, 10, 9, 255)
            } else {
                Color(255, 255, 255, 255)
            };
            if let Err(error) = window.set_background_color(Some(background)) {
                eprintln!("Failed to set the startup window background: {error}");
            }
            window.show().map_err(|error| error.to_string())
        });
    if result.is_err() {
        state.0.store(false, Ordering::Relaxed);
    }
    result
}

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle().clone();
    // Frontend import or initialization failures must not leave an invisible app.
    std::thread::Builder::new()
        .name("startup-window-fallback".to_owned())
        .spawn(move || {
            std::thread::sleep(Duration::from_secs(10));
            if let Err(error) = show_main_window(handle.clone(), handle.state(), None) {
                eprintln!("Failed to show the main window after startup timeout: {error}");
            }
        })?;
    Ok(())
}
