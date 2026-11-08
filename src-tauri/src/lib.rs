mod cli;
mod file_dialog;
mod process;
mod runtime;
mod startup;
mod tasks;
mod watch;

use cli::{
    cancel_cli, get_app_info, get_cli_info, get_runtime_info, path_exists, prepare_runtime,
    read_text_file, run_cli, write_text_file,
};
use tasks::{CliTaskState, cancel_cli_task, start_cli_query, start_cli_task};
use tauri_plugin_prevent_default::{Builder as PreventDefaultBuilder, Flags, PlatformOptions};
use watch::{
    FileWatchState, start_option_chart_watch, start_tracked_path_watch, stop_option_chart_watch,
    stop_tracked_path_watch,
};

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
        .manage(CliTaskState::default())
        .manage(FileWatchState::default())
        .manage(startup::StartupState::default())
        .setup(startup::setup)
        .invoke_handler(tauri::generate_handler![
            startup::show_main_window,
            file_dialog::pick_file_dialog,
            prepare_runtime,
            get_runtime_info,
            get_app_info,
            get_cli_info,
            start_cli_query,
            start_cli_task,
            cancel_cli_task,
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
