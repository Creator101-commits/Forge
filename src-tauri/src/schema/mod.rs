//! Schema module. Types here are the wire contract between Rust and TS and
//! are exported via `ts-rs` into `src/types/generated/`.
//!
//! M1 adds the persistence-facing models: `Project`, `Settings`,
//! `RecentProject`. CAD / circuit / PCB / BOM / AI schemas land later.

use serde::{Deserialize, Serialize};

/// The current on-disk / DB schema version. Bumped whenever a migration that
/// changes the project format ships.
pub const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
}

/// A Forge project. Persisted both as a row in the project's `forge.db` and as
/// a human-readable `forge-project.json` at the project root (source of truth
/// for quick open + diffing).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    /// Unix epoch seconds.
    #[ts(type = "number")]
    pub created_at: i64,
    /// Unix epoch seconds.
    #[ts(type = "number")]
    pub updated_at: i64,
    /// Target board profile id, e.g. `"uno"`, `"esp32"`. None until chosen.
    pub board_target: Option<String>,
    /// Working units, e.g. `"mm"` or `"mil"`.
    pub units: String,
    pub tags: Vec<String>,
    /// Default AI persona for this project: `"Engineer" | "Mentor" | "Student Helper"`.
    pub ai_persona: String,
    pub schema_version: u32,
}

impl Project {
    /// Construct a fresh project with sensible defaults and matching
    /// created/updated timestamps.
    pub fn new(id: impl Into<String>, name: impl Into<String>, now: i64) -> Self {
        Project {
            id: id.into(),
            name: name.into(),
            description: None,
            created_at: now,
            updated_at: now,
            board_target: None,
            units: "mm".to_string(),
            tags: Vec::new(),
            ai_persona: "Engineer".to_string(),
            schema_version: SCHEMA_VERSION,
        }
    }
}

/// User-level application settings. Persisted in the user-scoped SQLite DB,
/// not inside any individual project.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct Settings {
    /// `"dark" | "light"`.
    pub theme: String,
    /// `"comfortable" | "compact"`.
    pub density: String,
    pub reduced_motion: bool,
    pub telemetry_enabled: bool,
    /// Selected default AI provider id, if any.
    pub default_ai_provider: Option<String>,
    /// Preferred default board profile id, if any.
    pub default_board: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            theme: "dark".to_string(),
            density: "comfortable".to_string(),
            reduced_motion: false,
            telemetry_enabled: false,
            default_ai_provider: None,
            default_board: None,
        }
    }
}

/// An entry in the user's recent-projects list (user-level DB).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct RecentProject {
    pub path: String,
    pub name: String,
    /// Unix epoch seconds of the most recent open.
    #[ts(type = "number")]
    pub opened_at: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T>(value: &T) -> T
    where
        T: Serialize + for<'de> Deserialize<'de>,
    {
        let json = serde_json::to_string(value).expect("serialize");
        serde_json::from_str(&json).expect("deserialize")
    }

    #[test]
    fn project_serde_roundtrip() {
        let mut p = Project::new("p-1", "Temperature Monitor", 1_700_000_000);
        p.description = Some("demo".into());
        p.board_target = Some("uno".into());
        p.tags = vec!["sensor".into(), "i2c".into()];
        let back = roundtrip(&p);
        assert_eq!(p, back);
        assert_eq!(back.schema_version, SCHEMA_VERSION);
    }

    #[test]
    fn settings_serde_roundtrip_and_default() {
        let s = Settings::default();
        assert_eq!(s.theme, "dark");
        assert!(!s.telemetry_enabled);
        let back = roundtrip(&s);
        assert_eq!(s, back);
    }

    #[test]
    fn recent_project_serde_roundtrip() {
        let r = RecentProject {
            path: "/tmp/proj".into(),
            name: "proj".into(),
            opened_at: 42,
        };
        assert_eq!(r, roundtrip(&r));
    }
}
