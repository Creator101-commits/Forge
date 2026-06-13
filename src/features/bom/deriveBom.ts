import type { SchematicComponent } from "@/store/circuit";
import { getSymbol } from "@/features/circuit/symbols";

/**
 * BOM derivation (M8 step 1, client side).
 *
 * Aggregates schematic components into bill-of-materials rows, grouping by
 * (symbol, value) and collecting reference designators. Mirrors the intent of
 * the Rust `bom_ops` aggregator so the BOM stays in sync with the schematic.
 */

export interface BomRow {
  /** Sorted reference designators, e.g. ["R1", "R2"]. */
  refs: string[];
  value: string;
  symbolId: string;
  package_: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

/** Per-symbol sourcing metadata for derived rows. */
const CATALOG: Record<string, { package_: string; description: string; price: number }> = {
  resistor: { package_: "0805", description: "Resistor", price: 0.02 },
  capacitor: { package_: "0603", description: "Ceramic capacitor", price: 0.04 },
  inductor: { package_: "1210", description: "Inductor", price: 0.12 },
  led: { package_: "0805", description: "LED", price: 0.08 },
  diode: { package_: "SOD-123", description: "Diode", price: 0.05 },
  npn: { package_: "SOT-23", description: "NPN transistor", price: 0.11 },
  nmos: { package_: "SOT-23", description: "N-channel MOSFET", price: 0.18 },
  regulator: { package_: "SOT-223", description: "Voltage regulator", price: 0.35 },
  button: { package_: "THT", description: "Tactile push button", price: 0.09 },
  header2: { package_: "2.54mm", description: "2-pin header", price: 0.06 },
};

function refSortKey(ref: string): [string, number] {
  const m = ref.match(/^([A-Za-z]+)(\d+)$/);
  return m && m[1] && m[2] ? [m[1], parseInt(m[2], 10)] : [ref, 0];
}

export function deriveBom(components: SchematicComponent[]): BomRow[] {
  const groups = new Map<string, SchematicComponent[]>();
  for (const c of components) {
    const sym = getSymbol(c.symbolId);
    // Power symbols (GND/VCC) are not physical parts — skip them.
    if (!sym || sym.category === "Power") continue;
    const key = `${c.symbolId}|${c.value}`;
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }

  const rows: BomRow[] = [];
  for (const [key, comps] of groups) {
    const first = comps[0]!;
    const meta = CATALOG[first.symbolId] ?? {
      package_: "—",
      description: getSymbol(first.symbolId)?.name ?? first.symbolId,
      price: 0,
    };
    const refs = comps
      .map((c) => c.refDes)
      .sort((a, b) => {
        const [pa, na] = refSortKey(a);
        const [pb, nb] = refSortKey(b);
        return pa === pb ? na - nb : pa < pb ? -1 : 1;
      });
    rows.push({
      refs,
      value: first.value,
      symbolId: first.symbolId,
      package_: meta.package_,
      description: meta.description,
      qty: comps.length,
      unitPrice: meta.price,
      total: meta.price * comps.length,
    });
    void key;
  }

  // Stable order: by first reference designator.
  rows.sort((a, b) => {
    const [pa, na] = refSortKey(a.refs[0] ?? "");
    const [pb, nb] = refSortKey(b.refs[0] ?? "");
    return pa === pb ? na - nb : pa < pb ? -1 : 1;
  });
  return rows;
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Serialize BOM rows to CSV (matches the columns of `export::export_bom_csv`). */
export function bomToCsv(rows: BomRow[]): string {
  const header = ["Ref", "Value", "Package", "Description", "Qty", "Unit", "Total"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.refs.join(";")),
        csvCell(r.value),
        csvCell(r.package_),
        csvCell(r.description),
        String(r.qty),
        r.unitPrice.toFixed(2),
        r.total.toFixed(2),
      ].join(","),
    );
  }
  return lines.join("\n") + "\n";
}

export function bomTotal(rows: BomRow[]): number {
  return rows.reduce((s, r) => s + r.total, 0);
}
