//! Circuit commands: CRUD for components, pins, wires, nets, ERC.

use crate::app_state::AppState;
use crate::circuit_ops::{self, CircuitComponent, CircuitNet, CircuitPin, CircuitWire, ErcIssue};
use crate::errors::{ForgeError, Result};
use crate::project_store as store;
use std::path::PathBuf;
use tauri::State;

fn active_root(state: &AppState) -> Result<PathBuf> {
    state
        .active_root()
        .ok_or_else(|| ForgeError::InvalidArgument("no active project".into()))
}

fn db_path(root: &std::path::Path) -> PathBuf {
    store::project_db(root)
}

// ── Components ──

#[tauri::command]
pub fn circuit_list_components(state: State<'_, AppState>) -> Result<Vec<CircuitComponent>> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;
    let mut stmt = conn.prepare(
        "SELECT id, ref_des, value, symbol_id, footprint_id, x, y, rotation, mirrored, mode FROM circuit_component"
    )?;
    let rows = stmt
        .query_map([], |r| {
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
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(rows)
}

#[tauri::command]
pub fn circuit_add_component(
    state: State<'_, AppState>,
    comp: CircuitComponent,
) -> Result<CircuitComponent> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;
    conn.execute(
        "INSERT INTO circuit_component (id, ref_des, value, symbol_id, footprint_id, x, y, rotation, mirrored, mode)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        rusqlite::params![comp.id, comp.ref_des, comp.value, comp.symbol_id,
            comp.footprint_id, comp.x, comp.y, comp.rotation, comp.mirrored as i32, comp.mode],
    )?;
    store::append_event_at(
        &root,
        "circuit.add_component",
        &serde_json::to_value(&comp)?,
    )?;
    Ok(comp)
}

#[tauri::command]
pub fn circuit_remove_component(state: State<'_, AppState>, id: String) -> Result<()> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;
    conn.execute("DELETE FROM circuit_component WHERE id = ?1", [&id])?;
    store::append_event_at(
        &root,
        "circuit.remove_component",
        &serde_json::json!({"id": id}),
    )?;
    Ok(())
}

#[tauri::command]
pub fn circuit_update_component(
    state: State<'_, AppState>,
    comp: CircuitComponent,
) -> Result<CircuitComponent> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;
    conn.execute(
        "UPDATE circuit_component SET ref_des=?2,value=?3,symbol_id=?4,footprint_id=?5,x=?6,y=?7,rotation=?8,mirrored=?9,mode=?10 WHERE id=?1",
        rusqlite::params![comp.id, comp.ref_des, comp.value, comp.symbol_id,
            comp.footprint_id, comp.x, comp.y, comp.rotation, comp.mirrored as i32, comp.mode],
    )?;
    store::append_event_at(
        &root,
        "circuit.update_component",
        &serde_json::to_value(&comp)?,
    )?;
    Ok(comp)
}

// ── Pins ──

#[tauri::command]
pub fn circuit_list_pins(state: State<'_, AppState>) -> Result<Vec<CircuitPin>> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;
    let mut stmt = conn
        .prepare("SELECT id, component_id, name, number, x, y, electrical_type FROM circuit_pin")?;
    let rows = stmt
        .query_map([], |r| {
            Ok(CircuitPin {
                id: r.get(0)?,
                component_id: r.get(1)?,
                name: r.get(2)?,
                number: r.get(3)?,
                x: r.get(4)?,
                y: r.get(5)?,
                electrical_type: r.get(6)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(rows)
}

#[tauri::command]
pub fn circuit_add_pin(state: State<'_, AppState>, pin: CircuitPin) -> Result<CircuitPin> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;
    conn.execute(
        "INSERT INTO circuit_pin (id, component_id, name, number, x, y, electrical_type) VALUES (?1,?2,?3,?4,?5,?6,?7)",
        rusqlite::params![pin.id, pin.component_id, pin.name, pin.number, pin.x, pin.y, pin.electrical_type],
    )?;
    Ok(pin)
}

// ── Wires ──

#[tauri::command]
pub fn circuit_list_wires(state: State<'_, AppState>) -> Result<Vec<CircuitWire>> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;
    let mut stmt = conn.prepare("SELECT id, net_id, points_json, mode FROM circuit_wire")?;
    let rows = stmt
        .query_map([], |r| {
            let pts: String = r.get(2)?;
            Ok(CircuitWire {
                id: r.get(0)?,
                net_id: r.get(1)?,
                points: serde_json::from_str(&pts).unwrap_or_default(),
                mode: r.get(3)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(rows)
}

#[tauri::command]
pub fn circuit_add_wire(state: State<'_, AppState>, wire: CircuitWire) -> Result<CircuitWire> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;
    let pts = serde_json::to_string(&wire.points)?;
    conn.execute(
        "INSERT INTO circuit_wire (id, net_id, points_json, mode) VALUES (?1,?2,?3,?4)",
        rusqlite::params![wire.id, wire.net_id, pts, wire.mode],
    )?;
    Ok(wire)
}

#[tauri::command]
pub fn circuit_remove_wire(state: State<'_, AppState>, id: String) -> Result<()> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;
    conn.execute("DELETE FROM circuit_wire WHERE id = ?1", [&id])?;
    Ok(())
}

// ── Nets ──

#[tauri::command]
pub fn circuit_list_nets(state: State<'_, AppState>) -> Result<Vec<CircuitNet>> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;
    let mut stmt = conn.prepare("SELECT id, name, class FROM circuit_net")?;
    let rows = stmt
        .query_map([], |r| {
            Ok(CircuitNet {
                id: r.get(0)?,
                name: r.get(1)?,
                class: r.get(2)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(rows)
}

#[tauri::command]
pub fn circuit_add_net(state: State<'_, AppState>, net: CircuitNet) -> Result<CircuitNet> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;
    conn.execute(
        "INSERT INTO circuit_net (id, name, class) VALUES (?1,?2,?3)",
        rusqlite::params![net.id, net.name, net.class],
    )?;
    Ok(net)
}

// ── ERC ──

#[tauri::command]
pub fn circuit_run_erc(state: State<'_, AppState>) -> Result<Vec<ErcIssue>> {
    let root = active_root(&state)?;
    let conn = crate::db::open(&db_path(&root))?;

    // Collect all circuit data
    let mut stmt = conn.prepare("SELECT id, ref_des, value, symbol_id, footprint_id, x, y, rotation, mirrored, mode FROM circuit_component")?;
    let comps: Vec<CircuitComponent> = stmt
        .query_map([], |r| {
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
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let mut stmt = conn
        .prepare("SELECT id, component_id, name, number, x, y, electrical_type FROM circuit_pin")?;
    let pins: Vec<CircuitPin> = stmt
        .query_map([], |r| {
            Ok(CircuitPin {
                id: r.get(0)?,
                component_id: r.get(1)?,
                name: r.get(2)?,
                number: r.get(3)?,
                x: r.get(4)?,
                y: r.get(5)?,
                electrical_type: r.get(6)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let mut stmt = conn.prepare("SELECT id, net_id, points_json, mode FROM circuit_wire")?;
    let wires: Vec<CircuitWire> = stmt
        .query_map([], |r| {
            let pts: String = r.get(2)?;
            Ok(CircuitWire {
                id: r.get(0)?,
                net_id: r.get(1)?,
                points: serde_json::from_str(&pts).unwrap_or_default(),
                mode: r.get(3)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let mut stmt = conn.prepare("SELECT id, name, class FROM circuit_net")?;
    let nets: Vec<CircuitNet> = stmt
        .query_map([], |r| {
            Ok(CircuitNet {
                id: r.get(0)?,
                name: r.get(1)?,
                class: r.get(2)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(circuit_ops::run_erc(&comps, &pins, &wires, &nets))
}
