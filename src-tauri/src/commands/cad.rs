//! CAD commands: CRUD for scene objects and named views.

use crate::app_state::AppState;
use crate::cad_ops::{self, CadCollision, CadObject};
use crate::errors::{ForgeError, Result};
use crate::project_store as store;
use std::path::PathBuf;
use tauri::State;

fn open_db(root: &std::path::Path) -> Result<rusqlite::Connection> {
    crate::db::open(&store::project_db(root))
}

fn active_root(state: &AppState) -> Result<PathBuf> {
    state
        .active_root()
        .ok_or_else(|| ForgeError::InvalidArgument("no active project".into()))
}

fn read_cad_objects(conn: &rusqlite::Connection) -> Result<Vec<CadObject>> {
    let mut s = conn.prepare(
        "SELECT id, parent_id, name, kind, x, y, z, rx, ry, rz, sx, sy, sz, \
         color, locked, hidden, metadata_json FROM cad_object",
    )?;
    let rows = s.query_map([], |r| {
        Ok(CadObject {
            id: r.get(0)?,
            parent_id: r.get(1)?,
            name: r.get(2)?,
            kind: r.get(3)?,
            x: r.get(4)?,
            y: r.get(5)?,
            z: r.get(6)?,
            rx: r.get(7)?,
            ry: r.get(8)?,
            rz: r.get(9)?,
            sx: r.get(10)?,
            sy: r.get(11)?,
            sz: r.get(12)?,
            color: r.get(13)?,
            locked: r.get::<_, i32>(14)? != 0,
            hidden: r.get::<_, i32>(15)? != 0,
            metadata_json: r.get(16)?,
        })
    })?;
    rows.collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn cad_list_objects(state: State<'_, AppState>) -> Result<Vec<CadObject>> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    read_cad_objects(&conn)
}

#[tauri::command]
pub fn cad_add_object(state: State<'_, AppState>, obj: CadObject) -> Result<CadObject> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    conn.execute(
        "INSERT INTO cad_object (id, parent_id, name, kind, x, y, z, rx, ry, rz, \
         sx, sy, sz, color, locked, hidden, metadata_json) \
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)",
        rusqlite::params![
            obj.id,
            obj.parent_id,
            obj.name,
            obj.kind,
            obj.x,
            obj.y,
            obj.z,
            obj.rx,
            obj.ry,
            obj.rz,
            obj.sx,
            obj.sy,
            obj.sz,
            obj.color,
            obj.locked as i32,
            obj.hidden as i32,
            obj.metadata_json,
        ],
    )?;
    store::append_event_at(&root, "cad.add_object", &serde_json::to_value(&obj)?)?;
    Ok(obj)
}

#[tauri::command]
pub fn cad_update_object(state: State<'_, AppState>, obj: CadObject) -> Result<CadObject> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    let n = conn.execute(
        "UPDATE cad_object SET parent_id=?2, name=?3, kind=?4, x=?5, y=?6, z=?7, \
         rx=?8, ry=?9, rz=?10, sx=?11, sy=?12, sz=?13, color=?14, locked=?15, \
         hidden=?16, metadata_json=?17 WHERE id=?1",
        rusqlite::params![
            obj.id,
            obj.parent_id,
            obj.name,
            obj.kind,
            obj.x,
            obj.y,
            obj.z,
            obj.rx,
            obj.ry,
            obj.rz,
            obj.sx,
            obj.sy,
            obj.sz,
            obj.color,
            obj.locked as i32,
            obj.hidden as i32,
            obj.metadata_json,
        ],
    )?;
    if n == 0 {
        return Err(ForgeError::NotFound(format!(
            "object '{}' not found",
            obj.id
        )));
    }
    store::append_event_at(&root, "cad.update_object", &serde_json::to_value(&obj)?)?;
    Ok(obj)
}

#[tauri::command]
pub fn cad_remove_object(state: State<'_, AppState>, id: String) -> Result<()> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    let n = conn.execute("DELETE FROM cad_object WHERE id = ?1", [&id])?;
    if n == 0 {
        return Err(ForgeError::NotFound(format!("object '{}' not found", id)));
    }
    Ok(())
}

#[tauri::command]
pub fn cad_detect_collisions(state: State<'_, AppState>) -> Result<Vec<CadCollision>> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    let objs = read_cad_objects(&conn)?;
    Ok(cad_ops::detect_collisions(&objs))
}
