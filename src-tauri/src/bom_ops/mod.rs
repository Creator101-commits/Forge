//! BOM operations: types and aggregation from circuit components.

use serde::{Deserialize, Serialize};

/// A single line item in the Bill of Materials.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BomItem {
    pub id: String,
    pub ref_designators: Vec<String>,
    pub value: String,
    pub package_: String,
    pub description: String,
    pub quantity: u32,
    pub unit_price: Option<f64>,
    pub supplier: Option<String>,
    pub supplier_pn: Option<String>,
    pub stock: Option<i32>,
    pub notes: Option<String>,
}

/// Aggregate BOM items from circuit components. Groups identical components
/// by value + package, summing quantities.
pub fn aggregate_bom(components: &[crate::circuit_ops::CircuitComponent]) -> Vec<BomItem> {
    use std::collections::HashMap;

    let mut groups: HashMap<(String, String), Vec<&crate::circuit_ops::CircuitComponent>> =
        HashMap::new();
    for c in components {
        let key = (c.value.clone(), c.symbol_id.clone());
        groups.entry(key).or_default().push(c);
    }

    let mut items: Vec<BomItem> = groups
        .into_iter()
        .enumerate()
        .map(|(i, ((value, package), comps))| BomItem {
            id: format!("bom-{}", i + 1),
            ref_designators: comps.iter().map(|c| c.ref_des.clone()).collect(),
            value,
            package_: package,
            description: String::new(),
            quantity: comps.len() as u32,
            unit_price: None,
            supplier: None,
            supplier_pn: None,
            stock: None,
            notes: None,
        })
        .collect();

    items.sort_by(|a, b| {
        a.ref_designators
            .first()
            .unwrap_or(&String::new())
            .cmp(b.ref_designators.first().unwrap_or(&String::new()))
    });
    items
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::circuit_ops::CircuitComponent;

    fn comp(id: &str, ref_: &str, val: &str) -> CircuitComponent {
        CircuitComponent {
            id: id.into(),
            ref_des: ref_.into(),
            value: val.into(),
            symbol_id: "resistor".into(),
            footprint_id: None,
            x: 0.,
            y: 0.,
            rotation: 0.,
            mirrored: false,
            mode: "schematic".into(),
        }
    }

    #[test]
    fn aggregates_identical_components() {
        let comps = vec![
            comp("c1", "R1", "10k"),
            comp("c2", "R2", "10k"),
            comp("c3", "R3", "1k"),
        ];
        let items = aggregate_bom(&comps);
        assert_eq!(items.len(), 2);
        let r10k = items.iter().find(|i| i.value == "10k").unwrap();
        assert_eq!(r10k.quantity, 2);
        assert_eq!(r10k.ref_designators.len(), 2);
    }

    #[test]
    fn empty_components_yields_empty_bom() {
        assert!(aggregate_bom(&[]).is_empty());
    }
}
