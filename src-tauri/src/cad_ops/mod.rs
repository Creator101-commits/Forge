//! CAD operations: schema types and validation.
//!
//! The CAD workspace manages a 3D scene graph with transforms, materials,
//! and object hierarchy.

use serde::{Deserialize, Serialize};

/// A 3D object in the CAD scene.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CadObject {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub kind: String, // "box" | "cylinder" | "sphere" | "cone" | "torus" | "plane" | "model"
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub rx: f64,
    pub ry: f64,
    pub rz: f64,
    pub sx: f64,
    pub sy: f64,
    pub sz: f64,
    pub color: String,
    pub locked: bool,
    pub hidden: bool,
    pub metadata_json: String,
}

/// A named camera view.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CadView {
    pub id: String,
    pub name: String,
    pub camera_json: String, // {position, target, zoom}
}

/// A collision overlap warning between two objects.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CadCollision {
    pub object_a: String,
    pub object_b: String,
    pub overlap_mm: f64,
}

/// Check for AABB overlap between objects (simplified v1).
pub fn detect_collisions(objects: &[CadObject]) -> Vec<CadCollision> {
    let mut collisions = Vec::new();
    let visible: Vec<&CadObject> = objects.iter().filter(|o| !o.hidden).collect();
    for i in 0..visible.len() {
        for j in (i + 1)..visible.len() {
            let a = visible[i];
            let b = visible[j];
            let ox = ((a.x + a.sx / 2.0) - (b.x + b.sx / 2.0)).abs() - (a.sx + b.sx) / 2.0;
            let oy = ((a.y + a.sy / 2.0) - (b.y + b.sy / 2.0)).abs() - (a.sy + b.sy) / 2.0;
            let oz = ((a.z + a.sz / 2.0) - (b.z + b.sz / 2.0)).abs() - (a.sz + b.sz) / 2.0;
            if ox < 0.0 && oy < 0.0 && oz < 0.0 {
                collisions.push(CadCollision {
                    object_a: a.id.clone(),
                    object_b: b.id.clone(),
                    overlap_mm: (-ox).min(-oy).min(-oz).max(0.0),
                });
            }
        }
    }
    collisions
}

#[cfg(test)]
mod tests {
    use super::*;

    fn box_obj(id: &str, x: f64, y: f64, z: f64, sx: f64, sy: f64, sz: f64) -> CadObject {
        CadObject {
            id: id.into(),
            parent_id: None,
            name: id.into(),
            kind: "box".into(),
            x,
            y,
            z,
            rx: 0.,
            ry: 0.,
            rz: 0.,
            sx,
            sy,
            sz,
            color: "#888".into(),
            locked: false,
            hidden: false,
            metadata_json: "{}".into(),
        }
    }

    #[test]
    fn detects_overlapping_boxes() {
        let objs = vec![
            box_obj("a", 0., 0., 0., 10., 10., 10.),
            box_obj("b", 5., 5., 5., 10., 10., 10.),
        ];
        let cs = detect_collisions(&objs);
        assert!(!cs.is_empty());
    }

    #[test]
    fn no_collision_when_separated() {
        let objs = vec![
            box_obj("a", 0., 0., 0., 1., 1., 1.),
            box_obj("b", 10., 10., 10., 1., 1., 1.),
        ];
        assert!(detect_collisions(&objs).is_empty());
    }

    #[test]
    fn hidden_objects_ignored() {
        let mut objs = vec![
            box_obj("a", 0., 0., 0., 10., 10., 10.),
            box_obj("b", 5., 5., 5., 10., 10., 10.),
        ];
        objs[1].hidden = true;
        assert!(detect_collisions(&objs).is_empty());
    }
}
