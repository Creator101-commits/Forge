//! Compile + Upload module: toolchain detection, sketch compilation,
//! and firmware flashing via serial bootloader.
//!
//! Probes for common embedded toolchains (Arduino CLI, PlatformIO,
//! Rust Embedded, MicroPython) and can compile + upload sketches
//! using the detected toolchain.

use serde::{Deserialize, Serialize};
use std::process::Command;

/// A detected toolchain with its capabilities.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Toolchain {
    pub id: String,
    pub name: String,
    pub installed: bool,
    pub version: Option<String>,
}

/// Result of a compilation attempt.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileResult {
    pub success: bool,
    pub output: String,
    pub artifact_path: Option<String>,
    pub duration_ms: u64,
    pub toolchain_missing: bool,
}

/// Probing result: attempts to detect installed toolchains.
pub fn detect_toolchains() -> Vec<Toolchain> {
    vec![
        probe("arduino-cli", "Arduino CLI", &["version"]),
        probe("platformio", "PlatformIO", &["--version"]),
        probe(
            "rustup",
            "Rust Embedded",
            &["target", "list", "--installed"],
        ),
        probe("python3", "MicroPython", &["--version"]),
    ]
}

fn probe(id: &str, name: &str, args: &[&str]) -> Toolchain {
    match Command::new(id).args(args).output() {
        Ok(out) if out.status.success() => {
            let ver = String::from_utf8_lossy(&out.stdout)
                .lines()
                .next()
                .unwrap_or("")
                .to_string();
            Toolchain {
                id: id.into(),
                name: name.into(),
                installed: true,
                version: Some(ver),
            }
        }
        _ => Toolchain {
            id: id.into(),
            name: name.into(),
            installed: false,
            version: None,
        },
    }
}

/// Compile an Arduino sketch using `arduino-cli`.
pub fn compile_arduino(fqbn: &str, sketch_dir: &str) -> CompileResult {
    let start = std::time::Instant::now();
    match Command::new("arduino-cli")
        .args(["compile", "--fqbn", fqbn, sketch_dir])
        .output()
    {
        Ok(out) => {
            let output = String::from_utf8_lossy(&out.stdout).to_string()
                + &String::from_utf8_lossy(&out.stderr);
            CompileResult {
                success: out.status.success(),
                output,
                artifact_path: None,
                duration_ms: start.elapsed().as_millis() as u64,
                toolchain_missing: false,
            }
        }
        Err(e) => CompileResult {
            success: false,
            output: format!("Failed to run arduino-cli: {e}"),
            artifact_path: None,
            duration_ms: start.elapsed().as_millis() as u64,
            toolchain_missing: true,
        },
    }
}

/// Upload compiled firmware to a board via `arduino-cli`.
pub fn upload_arduino(fqbn: &str, port: &str, sketch_dir: &str) -> CompileResult {
    let start = std::time::Instant::now();
    match Command::new("arduino-cli")
        .args(["upload", "--fqbn", fqbn, "--port", port, sketch_dir])
        .output()
    {
        Ok(out) => {
            let output = String::from_utf8_lossy(&out.stdout).to_string()
                + &String::from_utf8_lossy(&out.stderr);
            CompileResult {
                success: out.status.success(),
                output,
                artifact_path: None,
                duration_ms: start.elapsed().as_millis() as u64,
                toolchain_missing: false,
            }
        }
        Err(e) => CompileResult {
            success: false,
            output: format!("Failed to run arduino-cli: {e}"),
            artifact_path: None,
            duration_ms: start.elapsed().as_millis() as u64,
            toolchain_missing: true,
        },
    }
}

/// List available Arduino boards via `arduino-cli board list`.
/// Parses the nested JSON structure: [{address, protocol, boards: [{name, fqbn}]}]
pub fn list_arduino_boards() -> Vec<BoardInfo> {
    match Command::new("arduino-cli")
        .args(["board", "list", "--format", "json"])
        .output()
    {
        Ok(out) if out.status.success() => {
            #[derive(Deserialize)]
            #[serde(rename_all = "camelCase")]
            struct CliEntry {
                address: String,
                #[serde(default)]
                boards: Vec<CliBoard>,
            }
            #[derive(Deserialize)]
            #[serde(rename_all = "camelCase")]
            struct CliBoard {
                name: Option<String>,
                fqbn: Option<String>,
            }

            let entries: Vec<CliEntry> = serde_json::from_slice(&out.stdout).unwrap_or_default();
            entries
                .into_iter()
                .flat_map(|e| {
                    let port = e.address.clone();
                    if e.boards.is_empty() {
                        vec![BoardInfo {
                            port: port.clone(),
                            board_name: None,
                            fqbn: None,
                        }]
                    } else {
                        e.boards
                            .into_iter()
                            .map(move |b| BoardInfo {
                                port: port.clone(),
                                board_name: b.name,
                                fqbn: b.fqbn,
                            })
                            .collect()
                    }
                })
                .collect()
        }
        _ => Vec::new(),
    }
}

/// Basic board info from `arduino-cli board list`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoardInfo {
    pub port: String,
    pub board_name: Option<String>,
    pub fqbn: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_returns_toolchains_list() {
        let chains = detect_toolchains();
        assert_eq!(chains.len(), 4);
        assert!(chains.iter().any(|t| t.id == "arduino-cli"));
    }

    #[test]
    fn compile_missing_sketch_reports_failure() {
        let result = compile_arduino("arduino:avr:uno", "/nonexistent/path");
        assert!(!result.success);
    }

    #[test]
    fn upload_missing_sketch_reports_failure() {
        let result = upload_arduino("arduino:avr:uno", "/dev/null", "/nonexistent/path");
        assert!(!result.success);
    }
}
