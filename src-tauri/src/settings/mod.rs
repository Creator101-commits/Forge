//! User-level settings persistence.
//!
//! Settings live in the user-scoped SQLite DB (`forge-user.db`) as a single
//! JSON row, so adding fields never requires a migration. Defaults are applied
//! when no row exists yet.

use crate::db;
use crate::errors::Result;
use crate::schema::Settings;
use std::path::Path;

/// Load settings, returning defaults if none have been saved yet.
pub fn get(user_db: &Path) -> Result<Settings> {
    let conn = db::open(user_db)?;
    let json: Option<String> = conn
        .query_row(
            "SELECT settings_json FROM app_settings WHERE id = 0",
            [],
            |r| r.get(0),
        )
        .ok();

    match json {
        Some(s) => Ok(serde_json::from_str(&s)?),
        None => Ok(Settings::default()),
    }
}

/// Persist settings (full replace) and return the stored value.
pub fn set(user_db: &Path, settings: &Settings) -> Result<Settings> {
    let conn = db::open(user_db)?;
    let json = serde_json::to_string(settings)?;
    conn.execute(
        "INSERT INTO app_settings (id, settings_json) VALUES (0, ?1)
         ON CONFLICT(id) DO UPDATE SET settings_json = excluded.settings_json",
        rusqlite::params![json],
    )?;
    Ok(settings.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn defaults_when_unset() {
        let tmp = tempdir().unwrap();
        let db = tmp.path().join("forge-user.db");
        let s = get(&db).unwrap();
        assert_eq!(s, Settings::default());
    }

    #[test]
    fn set_then_get_persists_across_connections() {
        let tmp = tempdir().unwrap();
        let db = tmp.path().join("forge-user.db");

        let s = Settings {
            theme: "light".into(),
            reduced_motion: true,
            ..Default::default()
        };
        set(&db, &s).unwrap();

        // Fresh read (new connection) — simulates an app restart.
        let loaded = get(&db).unwrap();
        assert_eq!(loaded.theme, "light");
        assert!(loaded.reduced_motion);
    }

    #[test]
    fn set_is_idempotent_single_row() {
        let tmp = tempdir().unwrap();
        let db = tmp.path().join("forge-user.db");
        set(&db, &Settings::default()).unwrap();
        let s2 = Settings {
            theme: "light".into(),
            ..Default::default()
        };
        set(&db, &s2).unwrap();

        let conn = crate::db::open(&db).unwrap();
        let count: i64 = conn
            .query_row("SELECT count(*) FROM app_settings", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
        assert_eq!(get(&db).unwrap().theme, "light");
    }
}
