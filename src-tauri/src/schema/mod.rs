//! Schema module. Types here are the wire contract between Rust and TS and
//! are exported via `ts-rs` into `src/types/generated/`.
//!
//! M0 surfaces only the version/health types. Project / CAD / circuit / PCB /
//! BOM / AI schemas land in subsequent milestones.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../src/types/generated/")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
}
