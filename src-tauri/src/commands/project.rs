//! Project / persistence commands.
//!
//! Each `#[tauri::command]` is a thin shim over an `*_impl` function that
//! takes `&AppState`, so the logic is unit-testable without a Tauri runtime.

use crate::app_state::AppState;
use crate::errors::{ForgeError, Result};
use crate::project_store as store;
use crate::schema::{Project, RecentProject};
use std::path::Path;
use tauri::State;

// ---------- impls (testable) ----------

pub fn create_project_impl(state: &AppState, path: &str, name: &str) -> Result<Project> {
    let root = Path::new(path);
    let project = store::create_project(root, name)?;
    store::record_recent(&state.user_db(), root, &project.name)?;
    state.set_active(root, project.clone());
    Ok(project)
}

pub fn open_project_impl(state: &AppState, path: &str) -> Result<Project> {
    let root = Path::new(path);
    let project = store::open_project(root)?;
    store::record_recent(&state.user_db(), root, &project.name)?;
    state.set_active(root, project.clone());
    Ok(project)
}

pub fn save_project_impl(state: &AppState, project: &Project) -> Result<Project> {
    let root = state
        .active_root()
        .ok_or_else(|| ForgeError::InvalidArgument("no active project to save".into()))?;
    let saved = store::save_project(&root, project)?;
    state.set_active(&root, saved.clone());
    Ok(saved)
}

pub fn close_project_impl(state: &AppState) -> Result<()> {
    state.clear_active();
    Ok(())
}

pub fn list_recent_projects_impl(state: &AppState) -> Result<Vec<RecentProject>> {
    store::list_recent(&state.user_db())
}

pub fn append_event_log_impl(
    state: &AppState,
    kind: &str,
    payload: &serde_json::Value,
) -> Result<i64> {
    let root = state
        .active_root()
        .ok_or_else(|| ForgeError::InvalidArgument("no active project for event log".into()))?;
    store::append_event_at(&root, kind, payload)
}

// ---------- commands ----------

#[tauri::command]
pub fn create_project(state: State<'_, AppState>, path: String, name: String) -> Result<Project> {
    create_project_impl(&state, &path, &name)
}

#[tauri::command]
pub fn open_project(state: State<'_, AppState>, path: String) -> Result<Project> {
    open_project_impl(&state, &path)
}

#[tauri::command]
pub fn save_project(state: State<'_, AppState>, project: Project) -> Result<Project> {
    save_project_impl(&state, &project)
}

#[tauri::command]
pub fn close_project(state: State<'_, AppState>) -> Result<()> {
    close_project_impl(&state)
}

#[tauri::command]
pub fn list_recent_projects(state: State<'_, AppState>) -> Result<Vec<RecentProject>> {
    list_recent_projects_impl(&state)
}

#[tauri::command]
pub fn append_event_log(
    state: State<'_, AppState>,
    kind: String,
    payload: serde_json::Value,
) -> Result<i64> {
    append_event_log_impl(&state, &kind, &payload)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn state_in(dir: &Path) -> AppState {
        AppState::new(dir.join("forge-user.db"))
    }

    #[test]
    fn create_sets_active_and_records_recent() {
        let tmp = tempdir().unwrap();
        let state = state_in(tmp.path());
        let root = tmp.path().join("proj");

        let p = create_project_impl(&state, root.to_str().unwrap(), "Demo").unwrap();
        assert_eq!(p.name, "Demo");
        assert_eq!(state.active().unwrap().project.id, p.id);

        let recents = list_recent_projects_impl(&state).unwrap();
        assert_eq!(recents.len(), 1);
        assert_eq!(recents[0].name, "Demo");
    }

    #[test]
    fn open_then_close_clears_active() {
        let tmp = tempdir().unwrap();
        let state = state_in(tmp.path());
        let root = tmp.path().join("proj");
        create_project_impl(&state, root.to_str().unwrap(), "Demo").unwrap();
        close_project_impl(&state).unwrap();
        assert!(state.active().is_none());

        let reopened = open_project_impl(&state, root.to_str().unwrap()).unwrap();
        assert_eq!(reopened.name, "Demo");
        assert!(state.active().is_some());
    }

    #[test]
    fn save_requires_active_project() {
        let tmp = tempdir().unwrap();
        let state = state_in(tmp.path());
        let p = Project::new("x", "Orphan", 0);
        assert!(save_project_impl(&state, &p).is_err());
    }

    #[test]
    fn save_persists_changes_through_active_root() {
        let tmp = tempdir().unwrap();
        let state = state_in(tmp.path());
        let root = tmp.path().join("proj");
        let mut p = create_project_impl(&state, root.to_str().unwrap(), "Before").unwrap();
        p.name = "After".into();
        let saved = save_project_impl(&state, &p).unwrap();
        assert_eq!(saved.name, "After");
        assert_eq!(store::read_project_file(&root).unwrap().name, "After");
    }

    #[test]
    fn event_log_requires_active_and_appends() {
        let tmp = tempdir().unwrap();
        let state = state_in(tmp.path());
        assert!(append_event_log_impl(&state, "k", &serde_json::json!({})).is_err());

        let root = tmp.path().join("proj");
        create_project_impl(&state, root.to_str().unwrap(), "Demo").unwrap();
        let id = append_event_log_impl(&state, "autosave", &serde_json::json!({"n": 1})).unwrap();
        assert!(id >= 1);
    }
}
