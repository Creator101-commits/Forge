//! Circuit operations: schema types, CRUD helpers, and ERC validation.
//!
//! Shared between the circuit workspace frontend and the ERC engine. All
//! mutations go through `apply_ops` which validates and logs changes.

use serde::{Deserialize, Serialize};

/// A component placed in a circuit diagram.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CircuitComponent {
    pub id: String,
    pub ref_des: String,
    pub value: String,
    pub symbol_id: String,
    pub footprint_id: Option<String>,
    pub x: f64,
    pub y: f64,
    pub rotation: f64,
    pub mirrored: bool,
    pub mode: String, // "schematic" | "breadboard" | "block" | "ladder"
}

/// A pin on a component.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CircuitPin {
    pub id: String,
    pub component_id: String,
    pub name: String,
    pub number: String,
    pub x: f64,
    pub y: f64,
    pub electrical_type: String, // "input" | "output" | "power" | "passive" | "unconnected"
}

/// A wire connecting two or more points.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CircuitWire {
    pub id: String,
    pub net_id: String,
    pub points: Vec<(f64, f64)>,
    pub mode: String,
}

/// A named net (electrical connection).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CircuitNet {
    pub id: String,
    pub name: String,
    pub class: String, // "signal" | "power" | "ground"
}

/// An annotation on the diagram.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CircuitAnnotation {
    pub id: String,
    pub kind: String, // "text" | "label" | "title"
    pub text: String,
    pub x: f64,
    pub y: f64,
}

/// ERC issue severity.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ErcSeverity {
    Error,
    Warning,
}

/// An ERC (Electrical Rules Check) issue.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErcIssue {
    pub severity: ErcSeverity,
    pub code: String,
    pub message: String,
    pub component_ids: Vec<String>,
}

/// Run basic ERC checks on a circuit.
pub fn run_erc(
    components: &[CircuitComponent],
    pins: &[CircuitPin],
    wires: &[CircuitWire],
    nets: &[CircuitNet],
) -> Vec<ErcIssue> {
    let mut issues = Vec::new();

    // Check for floating pins: traverse the pin → wire → net graph.
    // A pin is connected if any wire on the pin's net has endpoints near the pin.
    for pin in pins {
        // Find which nets are associated with wires connected to this pin.
        let connected = wires.iter().any(|w| {
            // Check if any wire point is close to this pin's coordinates.
            let touches_pin = w.points.iter().any(|(px, py)| {
                (*px - pin.x).abs() < 0.001 && (*py - pin.y).abs() < 0.001
            });
            if !touches_pin {
                return false;
            }
            // Verify the wire's net exists and has connections.
            nets.iter().any(|n| n.id == w.net_id)
        });
        let is_power = pin.electrical_type == "power";
        if !connected && !is_power {
            issues.push(ErcIssue {
                severity: ErcSeverity::Warning,
                code: "floating_pin".into(),
                message: format!("Pin {} ({}) of component {} appears unconnected", pin.name, pin.number, pin.component_id),
                component_ids: vec![pin.component_id.clone()],
            });
        }
    }

    // Check for duplicate reference designators
    for i in 0..components.len() {
        for j in (i + 1)..components.len() {
            if components[i].ref_des == components[j].ref_des {
                issues.push(ErcIssue {
                    severity: ErcSeverity::Error,
                    code: "duplicate_ref".into(),
                    message: format!("Duplicate reference designator: {}", components[i].ref_des),
                    component_ids: vec![components[i].id.clone(), components[j].id.clone()],
                });
            }
        }
    }

    // Check for missing power nets
    let has_gnd = nets.iter().any(|n| {
        n.name.to_lowercase().contains("gnd") || n.name.to_lowercase().contains("ground")
    });
    let has_vcc = nets.iter().any(|n| {
        n.name.to_lowercase().contains("vcc")
            || n.name.to_lowercase().contains("vdd")
            || n.name.to_lowercase().contains("3v3")
            || n.name.to_lowercase().contains("5v")
    });
    if !has_gnd {
        issues.push(ErcIssue {
            severity: ErcSeverity::Warning,
            code: "missing_gnd".into(),
            message: "No ground (GND) net found in the circuit".into(),
            component_ids: vec![],
        });
    }
    if !has_vcc {
        issues.push(ErcIssue {
            severity: ErcSeverity::Warning,
            code: "missing_power".into(),
            message: "No power (VCC/VDD) net found in the circuit".into(),
            component_ids: vec![],
        });
    }

    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_comp(id: &str, ref_des: &str) -> CircuitComponent {
        CircuitComponent {
            id: id.into(), ref_des: ref_des.into(), value: "10k".into(),
            symbol_id: "resistor".into(), footprint_id: None,
            x: 0.0, y: 0.0, rotation: 0.0, mirrored: false, mode: "schematic".into(),
        }
    }

    fn make_pin(id: &str, comp_id: &str, etype: &str, x: f64, y: f64) -> CircuitPin {
        CircuitPin {
            id: id.into(), component_id: comp_id.into(),
            name: "pin".into(), number: "1".into(),
            x, y, electrical_type: etype.into(),
        }
    }

    #[test]
    fn detects_duplicate_refs() {
        let comps = vec![make_comp("c1", "R1"), make_comp("c2", "R1")];
        let issues = run_erc(&comps, &[], &[], &[]);
        assert!(issues.iter().any(|i| i.code == "duplicate_ref"));
    }

    #[test]
    fn detects_floating_pin() {
        let pins = vec![make_pin("p1", "c1", "input", 0.0, 0.0)];
        let issues = run_erc(&[], &pins, &[], &[]);
        assert!(issues.iter().any(|i| i.code == "floating_pin"));
    }

    #[test]
    fn power_pins_are_exempt() {
        let pins = vec![make_pin("p1", "c1", "power", 0.0, 0.0)];
        let issues = run_erc(&[], &pins, &[], &[]);
        assert!(!issues.iter().any(|i| i.code == "floating_pin"));
    }

    #[test]
    fn detects_missing_power_nets() {
        let issues = run_erc(&[], &[], &[], &[]);
        assert!(issues.iter().any(|i| i.code == "missing_gnd"));
        assert!(issues.iter().any(|i| i.code == "missing_power"));
    }
}
