//! PCB operations: schema types, validation, and DRC engine.
//!
//! All PCB data lives in the per-project SQLite DB. Mutations are logged
//! to the event log for undo support.

use serde::{Deserialize, Serialize};

/// A PCB layer (copper, silkscreen, soldermask, etc.).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcbLayer {
    pub id: String,
    pub name: String,
    pub kind: String, // "top_copper" | "bottom_copper" | "silkscreen" | "soldermask" | "outline" | "drills"
    pub color: String,
    pub visible: bool,
}

/// A footprint placed on the board.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcbFootprint {
    pub id: String,
    pub component_ref: String,
    pub library_id: String,
    pub x: f64,
    pub y: f64,
    pub rotation: f64,
    pub side: String, // "top" | "bottom"
}

/// A pad on a footprint.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcbPad {
    pub id: String,
    pub footprint_id: String,
    pub name: String,
    pub net_id: Option<String>,
    pub shape_json: String, // JSON with shape type + dimensions
    pub layer_mask: u32,
}

/// A trace (copper route between pads).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcbTrace {
    pub id: String,
    pub net_id: String,
    pub layer_id: String,
    pub points_json: String,
    pub width: f64,
}

/// A via connecting traces across layers.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcbVia {
    pub id: String,
    pub net_id: String,
    pub x: f64,
    pub y: f64,
    pub drill: f64,
    pub diameter: f64,
}

/// A copper zone/pour.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcbZone {
    pub id: String,
    pub net_id: String,
    pub layer_id: String,
    pub polygon_json: String,
    pub clearance: f64,
}

/// The board outline.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcbOutline {
    pub id: String,
    pub polygon_json: String,
}

/// DRC issue severity.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum DrcSeverity {
    Error,
    Warning,
}

/// A DRC (Design Rule Check) issue.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrcIssue {
    pub severity: DrcSeverity,
    pub code: String,
    pub message: String,
    pub position: Option<(f64, f64)>,
}

/// Run basic DRC checks. In a full implementation this would check
/// clearance violations, unconnected nets, annular ring, etc.
pub fn run_drc(
    footprints: &[PcbFootprint],
    pads: &[PcbPad],
    traces: &[PcbTrace],
    _vias: &[PcbVia],
) -> Vec<DrcIssue> {
    let mut issues = Vec::new();

    // Check for footprints with no pads
    for fp in footprints {
        let has_pads = pads.iter().any(|p| p.footprint_id == fp.id);
        if !has_pads {
            issues.push(DrcIssue {
                severity: DrcSeverity::Warning,
                code: "footprint_no_pads".into(),
                message: format!("Footprint '{}' has no pads", fp.component_ref),
                position: Some((fp.x, fp.y)),
            });
        }
    }

    // Check for pads with no net assignment
    for pad in pads {
        if pad.net_id.is_none() {
            issues.push(DrcIssue {
                severity: DrcSeverity::Warning,
                code: "unconnected_pad".into(),
                message: format!(
                    "Pad '{}' on footprint '{}' has no net assignment",
                    pad.name, pad.footprint_id
                ),
                position: None,
            });
        }
    }

    // Check for traces with < 2 points
    for trace in traces {
        if let Ok(pts) = serde_json::from_str::<Vec<(f64, f64)>>(&trace.points_json) {
            if pts.len() < 2 {
                issues.push(DrcIssue {
                    severity: DrcSeverity::Error,
                    code: "invalid_trace".into(),
                    message: format!("Trace '{}' has fewer than 2 points", trace.id),
                    position: pts.first().copied(),
                });
            }
        }
    }

    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_fp(id: &str, ref_: &str) -> PcbFootprint {
        PcbFootprint {
            id: id.into(),
            component_ref: ref_.into(),
            library_id: "0805".into(),
            x: 0.,
            y: 0.,
            rotation: 0.,
            side: "top".into(),
        }
    }

    fn make_pad(id: &str, fp_id: &str, net: Option<&str>) -> PcbPad {
        PcbPad {
            id: id.into(),
            footprint_id: fp_id.into(),
            name: "1".into(),
            net_id: net.map(|s| s.into()),
            shape_json: "{}".into(),
            layer_mask: 1,
        }
    }

    #[test]
    fn detects_footprint_with_no_pads() {
        let fps = vec![make_fp("f1", "U1")];
        let issues = run_drc(&fps, &[], &[], &[]);
        assert!(issues.iter().any(|i| i.code == "footprint_no_pads"));
    }

    #[test]
    fn detects_unconnected_pad() {
        let pads = vec![make_pad("p1", "f1", None)];
        let issues = run_drc(&[], &pads, &[], &[]);
        assert!(issues.iter().any(|i| i.code == "unconnected_pad"));
    }

    #[test]
    fn detects_invalid_trace() {
        let t = PcbTrace {
            id: "t1".into(),
            net_id: "n1".into(),
            layer_id: "l1".into(),
            points_json: "[[0,0]]".into(),
            width: 0.2,
        };
        let issues = run_drc(&[], &[], &[t], &[]);
        assert!(issues.iter().any(|i| i.code == "invalid_trace"));
    }

    #[test]
    fn clean_board_has_no_issues() {
        let issues = run_drc(&[], &[], &[], &[]);
        assert!(issues.is_empty());
    }
}
