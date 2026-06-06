//! On-disk project format + SQLite-backed persistence.
//!
//! A project is a folder containing:
//!   - `forge-project.json`  — human-readable source of truth for the project
//!     metadata (quick open + diff-friendly).
//!   - `forge.db`            — per-project SQLite DB (event log, indexed graphs).
//!   - workspace subfolders  — `cad/ circuit/ pcb/ code/ bom/ exports/`.
//!
//! Writes to `forge-project.json` are atomic (write to `.tmp` → fsync →
//! rename) so a crash mid-write never corrupts the last good state.

use crate::db;
use crate::errors::{ForgeError, Result};
use crate::schema::{Project, RecentProject, SCHEMA_VERSION};
use rusqlite::Connection;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub const PROJECT_FILE: &str = "forge-project.json";
pub const PROJECT_DB: &str = "forge.db";
pub const SUBFOLDERS: &[&str] = &["cad", "circuit", "pcb", "code", "bom", "exports"];

/// Current unix epoch seconds.
pub fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

pub fn project_file(root: &Path) -> PathBuf {
    root.join(PROJECT_FILE)
}

pub fn project_db(root: &Path) -> PathBuf {
    root.join(PROJECT_DB)
}

fn validate_name(name: &str) -> Result<()> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(ForgeError::InvalidArgument("project name is empty".into()));
    }
    if trimmed.len() > 200 {
        return Err(ForgeError::InvalidArgument("project name too long".into()));
    }
    Ok(())
}

/// Create a new project folder at `root`. Fails if a project already exists
/// there.
pub fn create_project(root: &Path, name: &str) -> Result<Project> {
    validate_name(name)?;
    if project_file(root).exists() {
        return Err(ForgeError::InvalidArgument(
            "a project already exists at this path".into(),
        ));
    }

    fs::create_dir_all(root)?;
    for sub in SUBFOLDERS {
        fs::create_dir_all(root.join(sub))?;
    }

    let id = uuid::Uuid::new_v4().to_string();
    let project = Project::new(id, name.trim(), now_secs());

    // Initialize the per-project DB and persist the project row.
    let conn = db::open(&project_db(root))?;
    upsert_project_row(&conn, &project)?;

    write_project_file(root, &project)?;
    Ok(project)
}

/// Open an existing project, reading `forge-project.json` as the source of
/// truth and ensuring the project DB is migrated to the current version.
pub fn open_project(root: &Path) -> Result<Project> {
    let file = project_file(root);
    if !file.exists() {
        return Err(ForgeError::NotFound(format!(
            "no Forge project at {}",
            root.display()
        )));
    }
    let project = read_project_file(root)?;
    // Ensure DB exists + migrated (covers projects copied without their db,
    // and forward migrations of older projects).
    let _conn = db::open(&project_db(root))?;
    Ok(project)
}

/// Persist project metadata: atomically rewrite `forge-project.json`, upsert
/// the DB row, and append a snapshot to the event log.
pub fn save_project(root: &Path, project: &Project) -> Result<Project> {
    validate_name(&project.name)?;
    let mut updated = project.clone();
    updated.updated_at = now_secs();
    updated.schema_version = SCHEMA_VERSION;

    let conn = db::open(&project_db(root))?;
    upsert_project_row(&conn, &updated)?;
    append_event(&conn, "project.save", &serde_json::to_value(&updated)?)?;

    write_project_file(root, &updated)?;
    Ok(updated)
}

/// Read and parse `forge-project.json`.
pub fn read_project_file(root: &Path) -> Result<Project> {
    let bytes = fs::read(project_file(root))?;
    let project: Project = serde_json::from_slice(&bytes)?;
    Ok(project)
}

/// Append a row to the project event log, returning the new row id. Used for
/// autosave snapshots and crash recovery.
pub fn append_event(conn: &Connection, kind: &str, payload: &serde_json::Value) -> Result<i64> {
    conn.execute(
        "INSERT INTO event_log (kind, payload_json, created_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![kind, payload.to_string(), now_secs()],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Append an event by project root (opens the DB). Convenience for the
/// autosave command path.
pub fn append_event_at(root: &Path, kind: &str, payload: &serde_json::Value) -> Result<i64> {
    let conn = db::open(&project_db(root))?;
    append_event(&conn, kind, payload)
}

/// Number of rows currently in the event log (test/diagnostic helper).
pub fn event_count(conn: &Connection) -> Result<i64> {
    Ok(conn.query_row("SELECT count(*) FROM event_log", [], |r| r.get(0))?)
}

fn upsert_project_row(conn: &Connection, p: &Project) -> Result<()> {
    conn.execute(
        "INSERT INTO project
            (id, name, description, created_at, updated_at, board_target, units, tags_json, ai_persona, settings_json, schema_version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
         ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            description=excluded.description,
            updated_at=excluded.updated_at,
            board_target=excluded.board_target,
            units=excluded.units,
            tags_json=excluded.tags_json,
            ai_persona=excluded.ai_persona,
            schema_version=excluded.schema_version",
        rusqlite::params![
            p.id,
            p.name,
            p.description,
            p.created_at,
            p.updated_at,
            p.board_target,
            p.units,
            serde_json::to_string(&p.tags)?,
            p.ai_persona,
            Option::<String>::None,
            p.schema_version,
        ],
    )?;
    Ok(())
}

/// Atomically write `forge-project.json`: write to a sibling `.tmp` file,
/// fsync it, then rename over the destination. A crash before the rename
/// leaves the previous file intact.
fn write_project_file(root: &Path, project: &Project) -> Result<()> {
    let dest = project_file(root);
    let tmp = root.join(format!("{PROJECT_FILE}.tmp"));
    let json = serde_json::to_vec_pretty(project)?;

    {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(&json)?;
        f.sync_all()?;
    }
    fs::rename(&tmp, &dest)?;
    Ok(())
}

// ---------- Recent projects (user-level DB) ----------

/// Record (or refresh) a recent-project entry in the user-level DB.
pub fn record_recent(user_db: &Path, path: &Path, name: &str) -> Result<()> {
    let conn = db::open(user_db)?;
    conn.execute(
        "INSERT INTO recent_project (path, name, opened_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(path) DO UPDATE SET name=excluded.name, opened_at=excluded.opened_at",
        rusqlite::params![path.to_string_lossy(), name, now_secs()],
    )?;
    Ok(())
}

/// List recent projects, most recently opened first.
pub fn list_recent(user_db: &Path) -> Result<Vec<RecentProject>> {
    let conn = db::open(user_db)?;
    let mut stmt = conn.prepare(
        "SELECT path, name, opened_at FROM recent_project ORDER BY opened_at DESC, path ASC",
    )?;
    let rows = stmt
        .query_map([], |r| {
            Ok(RecentProject {
                path: r.get(0)?,
                name: r.get(1)?,
                opened_at: r.get(2)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn create_project_writes_expected_layout() {
        let tmp = tempdir().unwrap();
        let root = tmp.path().join("MyProject");
        let p = create_project(&root, "My Project").unwrap();

        assert_eq!(p.name, "My Project");
        assert!(!p.id.is_empty());
        assert!(project_file(&root).exists(), "forge-project.json present");
        assert!(project_db(&root).exists(), "forge.db present");
        for sub in SUBFOLDERS {
            assert!(root.join(sub).is_dir(), "subfolder {sub} present");
        }
    }

    #[test]
    fn create_then_open_roundtrips_metadata() {
        let tmp = tempdir().unwrap();
        let root = tmp.path().join("p");
        let created = create_project(&root, "Roundtrip").unwrap();
        let opened = open_project(&root).unwrap();
        assert_eq!(created, opened);
    }

    #[test]
    fn create_rejects_duplicate_and_empty_name() {
        let tmp = tempdir().unwrap();
        let root = tmp.path().join("p");
        create_project(&root, "First").unwrap();
        assert!(create_project(&root, "Again").is_err());

        let root2 = tmp.path().join("p2");
        assert!(create_project(&root2, "   ").is_err());
    }

    #[test]
    fn open_missing_project_is_not_found() {
        let tmp = tempdir().unwrap();
        let err = open_project(&tmp.path().join("nope")).unwrap_err();
        assert_eq!(err.code(), "not_found");
    }

    #[test]
    fn save_updates_timestamp_and_logs_event() {
        let tmp = tempdir().unwrap();
        let root = tmp.path().join("p");
        let mut p = create_project(&root, "Saver").unwrap();
        p.created_at -= 100;
        p.updated_at -= 100;
        p.description = Some("changed".into());

        let saved = save_project(&root, &p).unwrap();
        assert_eq!(saved.description.as_deref(), Some("changed"));
        assert!(saved.updated_at >= saved.created_at);

        let conn = db::open(&project_db(&root)).unwrap();
        assert!(event_count(&conn).unwrap() >= 1);
    }

    #[test]
    fn partial_write_to_tmp_leaves_prior_state_intact() {
        // Simulates a crash mid-write: the new bytes land in the `.tmp`
        // sibling and the rename never happens. The previous good
        // `forge-project.json` must remain fully valid.
        let tmp = tempdir().unwrap();
        let root = tmp.path().join("p");
        let original = create_project(&root, "Original").unwrap();

        // Crash mid-write: write garbage to the tmp file, never rename.
        let tmp_path = root.join(format!("{PROJECT_FILE}.tmp"));
        std::fs::write(&tmp_path, b"{ this is not valid json").unwrap();

        // The real file is still the last good state and parses cleanly.
        let recovered = read_project_file(&root).unwrap();
        assert_eq!(recovered, original);
        assert!(tmp_path.exists(), "stale tmp remains but is ignored");
    }

    #[test]
    fn atomic_save_never_exposes_partial_destination() {
        // After a successful save the destination is fully valid and the tmp
        // file has been consumed by the rename.
        let tmp = tempdir().unwrap();
        let root = tmp.path().join("p");
        let mut p = create_project(&root, "Atomic").unwrap();
        p.name = "Atomic Renamed".into();
        save_project(&root, &p).unwrap();

        let tmp_path = root.join(format!("{PROJECT_FILE}.tmp"));
        assert!(!tmp_path.exists(), "tmp consumed by rename");
        assert_eq!(read_project_file(&root).unwrap().name, "Atomic Renamed");
    }

    #[test]
    fn recent_projects_dedupe_and_order_by_recency() {
        let tmp = tempdir().unwrap();
        let user_db = tmp.path().join("forge-user.db");

        record_recent(&user_db, Path::new("/a"), "A").unwrap();
        std::thread::sleep(std::time::Duration::from_millis(5));
        record_recent(&user_db, Path::new("/b"), "B").unwrap();
        // Re-open A: it should move to the front and not duplicate.
        std::thread::sleep(std::time::Duration::from_millis(5));
        record_recent(&user_db, Path::new("/a"), "A").unwrap();

        let recents = list_recent(&user_db).unwrap();
        assert_eq!(recents.len(), 2);
        assert_eq!(recents[0].path, "/a");
    }
}
