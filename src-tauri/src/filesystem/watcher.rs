//! `notify`-based recursive filesystem watcher.
//!
//! `spawn` returns a handle owning the live watcher plus a channel of
//! project-relative change events. Dropping the handle stops watching.

use super::FsChange;
use crate::errors::{ForgeError, Result};
use notify::event::ModifyKind;
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::Receiver;

pub struct WatchHandle {
    _watcher: RecommendedWatcher,
    pub rx: Receiver<FsChange>,
}

fn classify(kind: &EventKind) -> &'static str {
    match kind {
        EventKind::Create(_) => "created",
        EventKind::Modify(ModifyKind::Name(_)) => "renamed",
        EventKind::Modify(_) => "modified",
        EventKind::Remove(_) => "removed",
        _ => "other",
    }
}

pub fn spawn(root: &Path) -> Result<WatchHandle> {
    let (tx, rx) = std::sync::mpsc::channel();
    // Canonicalize so event paths (which the OS may report via the real path,
    // e.g. macOS `/private/var/...` for a `/var/...` symlink) relativize.
    let root_buf = root.canonicalize().unwrap_or_else(|_| root.to_path_buf());

    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res {
            let kind = classify(&event.kind).to_string();
            let paths: Vec<String> = event
                .paths
                .iter()
                .filter_map(|p| super::relativize(&root_buf, p))
                .collect();
            let _ = tx.send(FsChange { kind, paths });
        }
    })
    .map_err(|e| ForgeError::Internal(e.to_string()))?;

    watcher
        .watch(root, RecursiveMode::Recursive)
        .map_err(|e| ForgeError::Internal(e.to_string()))?;

    Ok(WatchHandle {
        _watcher: watcher,
        rx,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::filesystem::write_file;
    use std::time::Duration;
    use tempfile::tempdir;

    #[test]
    fn emits_change_event_when_a_file_is_created() {
        let tmp = tempdir().unwrap();
        // Canonicalize so the watcher root and file write use the same resolved path
        // as the OS reports in events. This ensures relativize() matches correctly.
        let root = tmp
            .path()
            .canonicalize()
            .unwrap_or_else(|_| tmp.path().to_path_buf());
        let handle = spawn(&root).unwrap();

        // Give the watcher a moment to arm before mutating.
        std::thread::sleep(Duration::from_millis(500));
        write_file(&root, "main.ino", "void loop(){}").unwrap();

        // Collect events for up to ~5s; assert we observe our file.
        let deadline = std::time::Instant::now() + Duration::from_secs(5);
        let mut saw = false;
        while std::time::Instant::now() < deadline {
            if let Ok(change) = handle.rx.recv_timeout(Duration::from_millis(500)) {
                if change.paths.iter().any(|p| p.ends_with("main.ino")) {
                    saw = true;
                    break;
                }
            }
        }
        assert!(saw, "expected a watcher event mentioning main.ino");
    }
}
