//! Export commands: generate and write export artifacts.

use crate::app_state::AppState;
use crate::commands::bom::bom_generate_impl;
use crate::errors::Result;
use crate::export;
use std::path::PathBuf;
use tauri::State;

fn active_root(state: &AppState) -> Result<PathBuf> {
    state.active_root()
        .ok_or_else(|| crate::errors::ForgeError::InvalidArgument("no active project".into()))
}

#[tauri::command]
pub fn export_bom_csv(state: State<'_, AppState>) -> Result<String> {
    let root = active_root(&state)?;
    let items = bom_generate_impl(&state)?;
    let csv = export::export_bom_csv(&items);
    let path = format!(
        "exports/bom_{}.csv",
        chrono::Utc::now().format("%Y%m%d_%H%M%S")
    );
    export::write_export(&root, &path, &csv)?;
    Ok(path)
}

#[tauri::command]
pub fn export_schematic_svg(state: State<'_, AppState>) -> Result<String> {
    let root = active_root(&state)?;
    let svg = export::export_schematic_svg();
    let path = format!(
        "exports/schematic_{}.svg",
        chrono::Utc::now().format("%Y%m%d_%H%M%S")
    );
    export::write_export(&root, &path, &svg)?;
    Ok(path)
}
