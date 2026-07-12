mod cli;
mod runtime;
mod watch;

use cli::{
    CliProcessState, cancel_cli, get_app_info, get_runtime_info, path_exists, prepare_runtime,
    read_text_file, run_cli, write_text_file,
};
use watch::{
    FileWatchState, start_option_chart_watch, start_tracked_path_watch, stop_option_chart_watch,
    stop_tracked_path_watch,
};
use tauri_plugin_prevent_default::{Builder as PreventDefaultBuilder, Flags, PlatformOptions};

fn prevent_default_context_menu() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    PreventDefaultBuilder::new()
        .with_flags(Flags::CONTEXT_MENU)
        .platform(PlatformOptions::new().default_context_menus(false))
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(prevent_default_context_menu())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(CliProcessState::default())
        .manage(FileWatchState::default())
        .invoke_handler(tauri::generate_handler![
            prepare_runtime,
            get_runtime_info,
            get_app_info,
            run_cli,
            cancel_cli,
            read_text_file,
            write_text_file,
            path_exists,
            start_tracked_path_watch,
            stop_tracked_path_watch,
            start_option_chart_watch,
            stop_option_chart_watch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
