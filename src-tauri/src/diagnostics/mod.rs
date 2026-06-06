//! Diagnostics model shared across the app.
//!
//! M2 ships the types + an in-memory store fed by `push`. ERC (M4), DRC (M6),
//! and compiler diagnostics (M9) all funnel into this same shape so the
//! Problems panel is a single sink. Ranges are 1-based to match editor gutters.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[serde(rename_all = "lowercase")]
#[ts(export, export_to = "../src/types/generated/")]
pub enum Severity {
    Error,
    Warning,
    Info,
    Hint,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct Range {
    #[ts(type = "number")]
    pub start_line: u32,
    #[ts(type = "number")]
    pub start_col: u32,
    #[ts(type = "number")]
    pub end_line: u32,
    #[ts(type = "number")]
    pub end_col: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct Diagnostic {
    /// Project-relative file path the diagnostic refers to.
    pub file: String,
    pub range: Range,
    pub severity: Severity,
    pub message: String,
    /// Origin, e.g. `"erc" | "drc" | "compile" | "synthetic"`.
    pub source: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn severity_serializes_lowercase() {
        assert_eq!(
            serde_json::to_string(&Severity::Warning).unwrap(),
            "\"warning\""
        );
    }

    #[test]
    fn diagnostic_roundtrips() {
        let d = Diagnostic {
            file: "code/main.ino".into(),
            range: Range {
                start_line: 3,
                start_col: 1,
                end_line: 3,
                end_col: 10,
            },
            severity: Severity::Error,
            message: "expected ';'".into(),
            source: "compile".into(),
        };
        let json = serde_json::to_string(&d).unwrap();
        let back: Diagnostic = serde_json::from_str(&json).unwrap();
        assert_eq!(d, back);
    }
}
