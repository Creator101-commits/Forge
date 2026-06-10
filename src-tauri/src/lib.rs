//! Forge — Tauri 2 backend entry point.
//!
//! Wiring:
//!   - `telemetry` initializes tracing to stdout + platform log dir.
//!   - `commands` exposes the Tauri command surface (M0: ping, app_version, secrets).
//!   - `secrets`  wraps the OS keychain via the `keyring` crate.

pub mod ai;
pub mod app_state;
pub mod boards;
pub mod bom_ops;
pub mod cad_ops;
pub mod circuit_ops;
pub mod commands;
pub mod compile;
pub mod db;
pub mod diagnostics;
pub mod errors;
pub mod export;
pub mod filesystem;
pub mod pcb_ops;
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
            commands::ai::ai_list_providers,
            commands::ai::ai_set_provider,
            commands::ai::ai_test_connection,
            commands::ai::ai_chat,
            commands::ai::ai_apply_patch,
            commands::ai::ai_revert_patch,
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
            commands::circuit::circuit_list_components,
            commands::circuit::circuit_add_component,
            commands::circuit::circuit_remove_component,
            commands::circuit::circuit_update_component,
            commands::circuit::circuit_list_pins,
            commands::circuit::circuit_add_pin,
            commands::circuit::circuit_list_wires,
            commands::circuit::circuit_add_wire,
            commands::circuit::circuit_remove_wire,
            commands::circuit::circuit_list_nets,
            commands::circuit::circuit_add_net,
            commands::circuit::circuit_run_erc,
            commands::pcb::pcb_list_layers,
            commands::pcb::pcb_add_layer,
            commands::pcb::pcb_list_footprints,
            commands::pcb::pcb_add_footprint,
            commands::pcb::pcb_remove_footprint,
            commands::pcb::pcb_list_pads,
            commands::pcb::pcb_add_pad,
            commands::pcb::pcb_list_traces,
            commands::pcb::pcb_add_trace,
            commands::pcb::pcb_remove_trace,
            commands::pcb::pcb_list_vias,
            commands::pcb::pcb_add_via,
            commands::pcb::pcb_list_zones,
            commands::pcb::pcb_add_zone,
            commands::pcb::pcb_run_drc,
            commands::cad::cad_list_objects,
            commands::cad::cad_add_object,
            commands::cad::cad_update_object,
            commands::cad::cad_remove_object,
            commands::cad::cad_detect_collisions,
            commands::bom::bom_generate,
            commands::bom::bom_update_item,
            commands::export_cmd::export_bom_csv,
            commands::export_cmd::export_schematic_svg,
            commands::compile_cmd::compile_detect_toolchains,
            commands::compile_cmd::compile_sketch,
            commands::compile_cmd::upload_firmware,
            commands::compile_cmd::compile_list_boards,
        ])
        .run(tauri::generate_context!())
        .expect("error while running forge");
}
