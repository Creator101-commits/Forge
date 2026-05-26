//! Forge — Tauri 2 backend entry point.
//!
//! Wiring:
//!   - `telemetry` initializes tracing to stdout + platform log dir.
//!   - `commands` exposes the Tauri command surface (M0: ping, app_version, secrets).
//!   - `secrets`  wraps the OS keychain via the `keyring` crate.

pub mod commands;
pub mod errors;
pub mod schema;
pub mod secrets;
pub mod telemetry;

/// Bootstraps the Tauri application. Called from `main.rs`.
pub fn run() {
    // Best-effort logging init; never panic the app if logs cannot be opened.
    let _guard = telemetry::init().ok();

    tracing::info!(version = env!("CARGO_PKG_VERSION"), "forge starting");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            commands::app_version,
            commands::get_secret_meta,
            commands::set_secret,
            commands::delete_secret,
        ])
        .run(tauri::generate_context!())
        .expect("error while running forge");
}
