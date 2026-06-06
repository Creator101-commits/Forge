//! Forge — Tauri 2 backend entry point.
//!
//! Wiring:
//!   - `telemetry` initializes tracing to stdout + platform log dir.
//!   - `commands` exposes the Tauri command surface (M0: ping, app_version, secrets).
//!   - `secrets`  wraps the OS keychain via the `keyring` crate.

pub mod app_state;
pub mod boards;
pub mod commands;
pub mod db;
pub mod diagnostics;
pub mod errors;
pub mod filesystem;
pub mod project_store;
pub mod schema;
pub mod search;
pub mod secrets;
pub mod serial;
pub mod settings;
pub mod telemetry;

use app_state::AppState;

/// Bootstraps the Tauri application. Called from `main.rs`.
pub fn run() {
    // Best-effort logging init; never panic the app if logs cannot be opened.
    let _guard = telemetry::init().ok();

    tracing::info!(version = env!("CARGO_PKG_VERSION"), "forge starting");

    tauri::Builder::default()
        .manage(AppState::with_default_paths())
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            commands::app_version,
            commands::get_secret_meta,
            commands::set_secret,
            commands::delete_secret,
            commands::project::create_project,
            commands::project::open_project,
            commands::project::save_project,
            commands::project::close_project,
            commands::project::list_recent_projects,
            commands::project::append_event_log,
            commands::settings::get_settings,
            commands::settings::set_settings,
            commands::filesystem::read_file,
            commands::filesystem::write_file,
            commands::filesystem::list_dir,
            commands::filesystem::rename_path,
            commands::filesystem::delete_path,
            commands::filesystem::watch_path,
            commands::search::search_project,
            commands::diagnostics::push_diagnostic,
            commands::diagnostics::list_diagnostics,
            commands::diagnostics::clear_diagnostics,
            commands::serial::list_serial_ports,
            commands::serial::connect_serial,
            commands::serial::disconnect_serial,
            commands::serial::send_serial_data,
            commands::boards::list_board_profiles,
        ])
        .run(tauri::generate_context!())
        .expect("error while running forge");
}
