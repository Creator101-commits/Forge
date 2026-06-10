//! PCB commands: CRUD for layers, footprints, pads, traces, vias, zones, DRC.

use crate::app_state::AppState;
use crate::errors::{ForgeError, Result};
use crate::pcb_ops::{self, DrcIssue, PcbFootprint, PcbLayer, PcbPad, PcbTrace, PcbVia, PcbZone};
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

// ── Layers ──

#[tauri::command]
pub fn pcb_list_layers(state: State<'_, AppState>) -> Result<Vec<PcbLayer>> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    let mut s = conn.prepare("SELECT id, name, kind, color, visible FROM pcb_layer")?;
    let rows = s.query_map([], |r| {
        Ok(PcbLayer {
            id: r.get(0)?,
            name: r.get(1)?,
            kind: r.get(2)?,
            color: r.get(3)?,
            visible: r.get::<_, i32>(4)? != 0,
        })
    })?;
    rows.collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn pcb_add_layer(state: State<'_, AppState>, layer: PcbLayer) -> Result<PcbLayer> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    conn.execute(
        "INSERT INTO pcb_layer (id, name, kind, color, visible) VALUES (?1,?2,?3,?4,?5)",
        rusqlite::params![
            layer.id,
            layer.name,
            layer.kind,
            layer.color,
            layer.visible as i32
        ],
    )?;
    Ok(layer)
}

// ── Footprints ──

#[tauri::command]
pub fn pcb_list_footprints(state: State<'_, AppState>) -> Result<Vec<PcbFootprint>> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    let mut s = conn
        .prepare("SELECT id, component_ref, library_id, x, y, rotation, side FROM pcb_footprint")?;
    let rows = s.query_map([], |r| {
        Ok(PcbFootprint {
            id: r.get(0)?,
            component_ref: r.get(1)?,
            library_id: r.get(2)?,
            x: r.get(3)?,
            y: r.get(4)?,
            rotation: r.get(5)?,
            side: r.get(6)?,
        })
    })?;
    rows.collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn pcb_add_footprint(state: State<'_, AppState>, fp: PcbFootprint) -> Result<PcbFootprint> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    conn.execute(
        "INSERT INTO pcb_footprint (id, component_ref, library_id, x, y, rotation, side) VALUES (?1,?2,?3,?4,?5,?6,?7)",
        rusqlite::params![fp.id, fp.component_ref, fp.library_id, fp.x, fp.y, fp.rotation, fp.side],
    )?;
    store::append_event_at(&root, "pcb.add_footprint", &serde_json::to_value(&fp)?)?;
    Ok(fp)
}

#[tauri::command]
pub fn pcb_remove_footprint(state: State<'_, AppState>, id: String) -> Result<()> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    conn.execute("DELETE FROM pcb_footprint WHERE id = ?1", [&id])?;
    Ok(())
}

// ── Pads ──

#[tauri::command]
pub fn pcb_list_pads(state: State<'_, AppState>) -> Result<Vec<PcbPad>> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    let mut s =
        conn.prepare("SELECT id, footprint_id, name, net_id, shape_json, layer_mask FROM pcb_pad")?;
    let rows = s.query_map([], |r| {
        Ok(PcbPad {
            id: r.get(0)?,
            footprint_id: r.get(1)?,
            name: r.get(2)?,
            net_id: r.get(3)?,
            shape_json: r.get(4)?,
            layer_mask: r.get(5)?,
        })
    })?;
    rows.collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn pcb_add_pad(state: State<'_, AppState>, pad: PcbPad) -> Result<PcbPad> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    conn.execute(
        "INSERT INTO pcb_pad (id, footprint_id, name, net_id, shape_json, layer_mask) VALUES (?1,?2,?3,?4,?5,?6)",
        rusqlite::params![pad.id, pad.footprint_id, pad.name, pad.net_id, pad.shape_json, pad.layer_mask],
    )?;
    Ok(pad)
}

// ── Traces ──

#[tauri::command]
pub fn pcb_list_traces(state: State<'_, AppState>) -> Result<Vec<PcbTrace>> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    let mut s = conn.prepare("SELECT id, net_id, layer_id, points_json, width FROM pcb_trace")?;
    let rows = s.query_map([], |r| {
        Ok(PcbTrace {
            id: r.get(0)?,
            net_id: r.get(1)?,
            layer_id: r.get(2)?,
            points_json: r.get(3)?,
            width: r.get(4)?,
        })
    })?;
    rows.collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn pcb_add_trace(state: State<'_, AppState>, trace: PcbTrace) -> Result<PcbTrace> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    conn.execute(
        "INSERT INTO pcb_trace (id, net_id, layer_id, points_json, width) VALUES (?1,?2,?3,?4,?5)",
        rusqlite::params![
            trace.id,
            trace.net_id,
            trace.layer_id,
            trace.points_json,
            trace.width
        ],
    )?;
    Ok(trace)
}

#[tauri::command]
pub fn pcb_remove_trace(state: State<'_, AppState>, id: String) -> Result<()> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    conn.execute("DELETE FROM pcb_trace WHERE id = ?1", [&id])?;
    Ok(())
}

// ── Vias ──

#[tauri::command]
pub fn pcb_list_vias(state: State<'_, AppState>) -> Result<Vec<PcbVia>> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    let mut s = conn.prepare("SELECT id, net_id, x, y, drill, diameter FROM pcb_via")?;
    let rows = s.query_map([], |r| {
        Ok(PcbVia {
            id: r.get(0)?,
            net_id: r.get(1)?,
            x: r.get(2)?,
            y: r.get(3)?,
            drill: r.get(4)?,
            diameter: r.get(5)?,
        })
    })?;
    rows.collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn pcb_add_via(state: State<'_, AppState>, via: PcbVia) -> Result<PcbVia> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    conn.execute(
        "INSERT INTO pcb_via (id, net_id, x, y, drill, diameter) VALUES (?1,?2,?3,?4,?5,?6)",
        rusqlite::params![via.id, via.net_id, via.x, via.y, via.drill, via.diameter],
    )?;
    Ok(via)
}

// ── Zones ──

#[tauri::command]
pub fn pcb_list_zones(state: State<'_, AppState>) -> Result<Vec<PcbZone>> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    let mut s =
        conn.prepare("SELECT id, net_id, layer_id, polygon_json, clearance FROM pcb_zone")?;
    let rows = s.query_map([], |r| {
        Ok(PcbZone {
            id: r.get(0)?,
            net_id: r.get(1)?,
            layer_id: r.get(2)?,
            polygon_json: r.get(3)?,
            clearance: r.get(4)?,
        })
    })?;
    rows.collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn pcb_add_zone(state: State<'_, AppState>, zone: PcbZone) -> Result<PcbZone> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;
    conn.execute(
        "INSERT INTO pcb_zone (id, net_id, layer_id, polygon_json, clearance) VALUES (?1,?2,?3,?4,?5)",
        rusqlite::params![zone.id, zone.net_id, zone.layer_id, zone.polygon_json, zone.clearance],
    )?;
    Ok(zone)
}

// ── DRC ──

#[tauri::command]
pub fn pcb_run_drc(state: State<'_, AppState>) -> Result<Vec<DrcIssue>> {
    let root = active_root(&state)?;
    let conn = open_db(&root)?;

    let mut s = conn
        .prepare("SELECT id, component_ref, library_id, x, y, rotation, side FROM pcb_footprint")?;
    let fps: Vec<PcbFootprint> = s
        .query_map([], |r| {
            Ok(PcbFootprint {
                id: r.get(0)?,
                component_ref: r.get(1)?,
                library_id: r.get(2)?,
                x: r.get(3)?,
                y: r.get(4)?,
                rotation: r.get(5)?,
                side: r.get(6)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let mut s =
        conn.prepare("SELECT id, footprint_id, name, net_id, shape_json, layer_mask FROM pcb_pad")?;
    let pads: Vec<PcbPad> = s
        .query_map([], |r| {
            Ok(PcbPad {
                id: r.get(0)?,
                footprint_id: r.get(1)?,
                name: r.get(2)?,
                net_id: r.get(3)?,
                shape_json: r.get(4)?,
                layer_mask: r.get(5)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let mut s = conn.prepare("SELECT id, net_id, layer_id, points_json, width FROM pcb_trace")?;
    let traces: Vec<PcbTrace> = s
        .query_map([], |r| {
            Ok(PcbTrace {
                id: r.get(0)?,
                net_id: r.get(1)?,
                layer_id: r.get(2)?,
                points_json: r.get(3)?,
                width: r.get(4)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let mut s = conn.prepare("SELECT id, net_id, x, y, drill, diameter FROM pcb_via")?;
    let vias: Vec<PcbVia> = s
        .query_map([], |r| {
            Ok(PcbVia {
                id: r.get(0)?,
                net_id: r.get(1)?,
                x: r.get(2)?,
                y: r.get(3)?,
                drill: r.get(4)?,
                diameter: r.get(5)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(pcb_ops::run_drc(&fps, &pads, &traces, &vias))
}
