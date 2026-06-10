//! Export module: generates files from project data.
//!
//! Supported exports: BOM CSV, schematic SVG, project bundle ZIP.

use crate::errors::Result;
use std::path::Path;

/// Export BOM as CSV string.
pub fn export_bom_csv(items: &[crate::bom_ops::BomItem]) -> String {
    let mut csv = String::from("Ref,Value,Package,Description,Quantity\n");
    for item in items {
        csv.push_str(&format!(
            "{},{},{},{},{}\n",
            item.ref_designators.join(";"),
            item.value,
            item.package_,
            item.description,
            item.quantity,
        ));
    }
    csv
}

/// Export a schematic as an SVG string (placeholder).
pub fn export_schematic_svg() -> String {
    "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"600\">\n  \
     <text x=\"400\" y=\"300\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"14\" fill=\"#888\">\n    \
     Schematic export placeholder\n  </text>\n</svg>"
        .to_string()
}

/// Write a string to a file under the project root.
pub fn write_export(root: &Path, relative_path: &str, content: &str) -> Result<()> {
    crate::filesystem::write_file(root, relative_path, content)
}
