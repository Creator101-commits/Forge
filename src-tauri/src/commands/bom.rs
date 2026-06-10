//! BOM commands: generate BOM from circuit components.

use crate::app_state::AppState;
use crate::bom_ops::{self, BomItem};
use crate::circuit_ops::CircuitComponent;
use crate::errors::Result;
use crate::project_store as store;
use std::path::PathBuf;
use tauri::State;

fn active_root(state: &AppState) -> Result<PathBuf> {
    state
        .active_root()
        .ok_or_else(|| crate::errors::ForgeError::InvalidArgument("no active project".into()))
}

fn load_circuit_components(conn: &rusqlite::Connection) -> Result<Vec<CircuitComponent>> {
    let mut s = conn.prepare(
        "SELECT id, ref_des, value, symbol_id, footprint_id, x, y, rotation, mirrored, mode \
         FROM circuit_component",
    )?;
    let rows = s.query_map([], |r| {
        Ok(CircuitComponent {
            id: r.get(0)?,
            ref_des: r.get(1)?,
            value: r.get(2)?,
            symbol_id: r.get(3)?,
            footprint_id: r.get(4)?,
            x: r.get(5)?,
            y: r.get(6)?,
            rotation: r.get(7)?,
            mirrored: r.get::<_, i32>(8)? != 0,
            mode: r.get(9)?,
        })
    })?;
    rows.collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.into())
}

pub fn bom_generate_impl(state: &AppState) -> Result<Vec<BomItem>> {
    let root = active_root(state)?;
    let conn = crate::db::open(&store::project_db(&root))?;
    let comps = load_circuit_components(&conn)?;
    Ok(bom_ops::aggregate_bom(&comps))
}

#[tauri::command]
pub fn bom_generate(state: State<'_, AppState>) -> Result<Vec<BomItem>> {
    bom_generate_impl(&state)
}

#[tauri::command]
pub fn bom_update_item(state: State<'_, AppState>, item: BomItem) -> Result<BomItem> {
    let root = active_root(&state)?;
    store::append_event_at(&root, "bom.update_item", &serde_json::to_value(&item)?)?;
    Ok(item)
}
