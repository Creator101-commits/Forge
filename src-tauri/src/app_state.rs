//! Global application state held by Tauri and shared across commands.
//!
//! Kept intentionally small: the active project handle (root + metadata) and
//! the path to the user-level DB. SQLite connections are opened on demand per
//! command rather than held here, which keeps the state `Send + Sync` without
//! wrapping a non-`Sync` `Connection`.

use crate::diagnostics::Diagnostic;
use crate::schema::Project;
use crate::serial::SerialSession;
use directories::ProjectDirs;
use parking_lot::{Mutex, RwLock};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct ActiveProject {
    pub root: PathBuf,
    pub project: Project,
}

pub struct AppState {
    inner: RwLock<Inner>,
    diagnostics: RwLock<Vec<Diagnostic>>,
    serial: Mutex<Option<SerialSession>>,
    watch_stop: Mutex<Option<Arc<AtomicBool>>>,
    pub ai_registry: crate::ai::registry::ProviderRegistry,
}

struct Inner {
    user_db: PathBuf,
    active: Option<ActiveProject>,
}

impl AppState {
    pub fn new(user_db: PathBuf) -> Self {
        AppState {
            inner: RwLock::new(Inner {
                user_db,
                active: None,
            }),
            diagnostics: RwLock::new(Vec::new()),
            serial: Mutex::new(None),
            watch_stop: Mutex::new(None),
            ai_registry: crate::ai::registry::ProviderRegistry::new(),
        }
    }

    /// Construct using the platform default user-DB location.
    pub fn with_default_paths() -> Self {
        AppState::new(default_user_db())
    }

    pub fn user_db(&self) -> PathBuf {
        self.inner.read().user_db.clone()
    }

    pub fn active(&self) -> Option<ActiveProject> {
        self.inner.read().active.clone()
    }

    pub fn active_root(&self) -> Option<PathBuf> {
        self.inner.read().active.as_ref().map(|a| a.root.clone())
    }

    pub fn set_active(&self, root: &Path, project: Project) {
        self.inner.write().active = Some(ActiveProject {
            root: root.to_path_buf(),
            project,
        });
    }

    pub fn clear_active(&self) {
        self.inner.write().active = None;
    }

    // ---- diagnostics ----

    pub fn push_diagnostic(&self, d: Diagnostic) {
        self.diagnostics.write().push(d);
    }

    pub fn set_diagnostics(&self, ds: Vec<Diagnostic>) {
        *self.diagnostics.write() = ds;
    }

    pub fn diagnostics(&self) -> Vec<Diagnostic> {
        self.diagnostics.read().clone()
    }

    pub fn clear_diagnostics(&self) {
        self.diagnostics.write().clear();
    }

    // ---- serial session ----

    pub fn set_serial(&self, session: Option<SerialSession>) {
        *self.serial.lock() = session;
    }

    pub fn has_serial(&self) -> bool {
        self.serial.lock().is_some()
    }

    /// Write bytes to the active serial session, if any.
    pub fn serial_write(&self, data: &[u8]) -> crate::errors::Result<()> {
        match self.serial.lock().as_ref() {
            Some(s) => s.write(data),
            None => Err(crate::errors::ForgeError::InvalidArgument(
                "no serial connection is open".into(),
            )),
        }
    }

    // ---- watcher lifecycle ----

    /// Signal any previous watcher-forwarding thread to stop and install a new
    /// stop flag. Returns the new flag for the freshly spawned thread to poll.
    pub fn swap_watch_stop(&self) -> Arc<AtomicBool> {
        let mut guard = self.watch_stop.lock();
        if let Some(prev) = guard.take() {
            prev.store(true, Ordering::Relaxed);
        }
        let flag = Arc::new(AtomicBool::new(false));
        *guard = Some(Arc::clone(&flag));
        flag
    }
}

/// Default user-level DB path under the platform data directory.
pub fn default_user_db() -> PathBuf {
    if let Some(dirs) = ProjectDirs::from("com", "Forge", "Forge") {
        let dir = dirs.data_dir().to_path_buf();
        let _ = std::fs::create_dir_all(&dir);
        dir.join("forge-user.db")
    } else {
        PathBuf::from("forge-user.db")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::project_store::now_secs;

    #[test]
    fn set_and_clear_active() {
        let state = AppState::new(PathBuf::from("/tmp/forge-user.db"));
        assert!(state.active().is_none());

        let p = Project::new("id", "Demo", now_secs());
        state.set_active(Path::new("/tmp/proj"), p.clone());
        let active = state.active().unwrap();
        assert_eq!(active.project.id, "id");
        assert_eq!(active.root, PathBuf::from("/tmp/proj"));

        state.clear_active();
        assert!(state.active().is_none());
    }
}
