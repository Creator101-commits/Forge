//! SQLite access + schema migrations.
//!
//! Migrations are embedded from the `migrations/` directory at compile time
//! via `refinery` and applied forward-only. The same migration set backs both
//! the per-project `forge.db` and the user-level `forge-user.db`; each DB only
//! uses the tables relevant to it.

use crate::errors::Result;
use rusqlite::Connection;
use std::path::Path;

mod embedded {
    refinery::embed_migrations!("migrations");
}

/// Open (creating if needed) a SQLite database at `path` and run all pending
/// migrations. Enables foreign keys + WAL for crash resilience.
pub fn open(path: &Path) -> Result<Connection> {
    let mut conn = Connection::open(path)?;
    configure(&conn)?;
    embedded::migrations::runner().run(&mut conn)?;
    Ok(conn)
}

/// Open an in-memory database (used by tests) with migrations applied.
#[cfg(test)]
pub fn open_in_memory() -> Result<Connection> {
    let mut conn = Connection::open_in_memory()?;
    configure(&conn)?;
    embedded::migrations::runner().run(&mut conn)?;
    Ok(conn)
}

fn configure(conn: &Connection) -> Result<()> {
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    Ok(())
}

/// Highest applied migration version, or 0 if none. Useful for assertions and
/// for surfacing the on-disk schema version.
pub fn applied_version(conn: &mut Connection) -> Result<u32> {
    let last = embedded::migrations::runner()
        .get_applied_migrations(conn)?
        .into_iter()
        .map(|m| m.version())
        .max()
        .unwrap_or(0);
    Ok(last)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn fresh_db_runs_migrations_and_creates_tables() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("forge.db");
        let mut conn = open(&path).unwrap();
        assert_eq!(applied_version(&mut conn).unwrap(), 1);

        for table in ["project", "event_log", "recent_project", "app_settings"] {
            let count: i64 = conn
                .query_row(
                    "SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?1",
                    [table],
                    |r| r.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "table {table} should exist");
        }
    }

    #[test]
    fn reopening_existing_db_is_idempotent() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("forge.db");
        {
            let mut conn = open(&path).unwrap();
            assert_eq!(applied_version(&mut conn).unwrap(), 1);
        }
        // Reopening (upgrade path with nothing to do) must not error or
        // re-apply migrations.
        let mut conn = open(&path).unwrap();
        assert_eq!(applied_version(&mut conn).unwrap(), 1);
    }
}
