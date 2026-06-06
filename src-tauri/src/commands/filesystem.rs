//! Filesystem commands, sandboxed to the active project root.

use crate::app_state::AppState;
use crate::errors::{ForgeError, Result};
use crate::filesystem::{self as fs, DirEntry};
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::time::Duration;
use tauri::{Emitter, State};

fn active_root(state: &AppState) -> Result<PathBuf> {
    state
        .active_root()
        .ok_or_else(|| ForgeError::InvalidArgument("no active project".into()))
}

pub fn read_file_impl(state: &AppState, path: &str) -> Result<String> {
    fs::read_file(&active_root(state)?, path)
}

pub fn write_file_impl(state: &AppState, path: &str, contents: &str) -> Result<()> {
    fs::write_file(&active_root(state)?, path, contents)
}

pub fn list_dir_impl(state: &AppState, path: &str) -> Result<Vec<DirEntry>> {
    fs::list_dir(&active_root(state)?, path)
}

pub fn rename_path_impl(state: &AppState, from: &str, to: &str) -> Result<()> {
    fs::rename_path(&active_root(state)?, from, to)
}

pub fn delete_path_impl(state: &AppState, path: &str) -> Result<()> {
    fs::delete_path(&active_root(state)?, path)
}

#[tauri::command]
pub fn read_file(state: State<'_, AppState>, path: String) -> Result<String> {
    read_file_impl(&state, &path)
}

#[tauri::command]
pub fn write_file(state: State<'_, AppState>, path: String, contents: String) -> Result<()> {
    write_file_impl(&state, &path, &contents)
}

#[tauri::command]
pub fn list_dir(state: State<'_, AppState>, path: String) -> Result<Vec<DirEntry>> {
    list_dir_impl(&state, &path)
}

#[tauri::command]
pub fn rename_path(state: State<'_, AppState>, from: String, to: String) -> Result<()> {
    rename_path_impl(&state, &from, &to)
}

#[tauri::command]
pub fn delete_path(state: State<'_, AppState>, path: String) -> Result<()> {
    delete_path_impl(&state, &path)
}

/// Begin watching the active project root, emitting `fs://change` events. Any
/// previously installed watcher is stopped first.
#[tauri::command]
pub fn watch_path(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<()> {
    let root = active_root(&state)?;
    let handle = fs::watcher::spawn(&root)?;
    let stop = state.swap_watch_stop();

    std::thread::spawn(move || {
        // Owning `handle` here keeps the underlying watcher alive for the
        // thread's lifetime; we exit (and drop it) when signaled to stop.
        let handle = handle;
        while !stop.load(Ordering::Relaxed) {
            match handle.rx.recv_timeout(Duration::from_millis(200)) {
                Ok(change) => {
                    let _ = app.emit("fs://change", change);
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => continue,
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::project_store;
    use std::path::Path;
    use tempfile::tempdir;

    fn state_with_project(dir: &Path) -> (AppState, PathBuf) {
        let state = AppState::new(dir.join("forge-user.db"));
        let root = dir.join("proj");
        let project = project_store::create_project(&root, "Demo").unwrap();
        state.set_active(&root, project);
        (state, root)
    }

    #[test]
    fn read_write_list_through_active_project() {
        let tmp = tempdir().unwrap();
        let (state, _root) = state_with_project(tmp.path());

        write_file_impl(&state, "code/main.ino", "void setup(){}").unwrap();
        assert_eq!(
            read_file_impl(&state, "code/main.ino").unwrap(),
            "void setup(){}"
        );

        let entries = list_dir_impl(&state, "code").unwrap();
        assert!(entries.iter().any(|e| e.name == "main.ino"));
    }

    #[test]
    fn rejects_traversal_through_commands() {
        let tmp = tempdir().unwrap();
        let (state, _root) = state_with_project(tmp.path());
        assert!(read_file_impl(&state, "../../etc/passwd").is_err());
        assert!(write_file_impl(&state, "../escape", "x").is_err());
    }

    #[test]
    fn errors_when_no_active_project() {
        let tmp = tempdir().unwrap();
        let state = AppState::new(tmp.path().join("forge-user.db"));
        assert!(read_file_impl(&state, "a.txt").is_err());
    }
}
