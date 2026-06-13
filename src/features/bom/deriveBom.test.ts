import { describe, it, expect } from "vitest";
import { deriveBom, bomToCsv, bomTotal } from "./deriveBom";
import type { SchematicComponent } from "@/store/circuit";

let n = 0;
function comp(symbolId: string, value: string, refDes: string): SchematicComponent {
  return { id: `c${n++}`, refDes, symbolId, value, x: 0, y: 0, rotation: 0, mirrored: false };
}

describe("deriveBom", () => {
  it("groups by symbol + value and collects references", () => {
    const rows = deriveBom([
      comp("resistor", "10k", "R1"),
      comp("resistor", "10k", "R2"),
      comp("resistor", "1k", "R3"),
      comp("led", "RED", "D1"),
    ]);
    const r10k = rows.find((r) => r.symbolId === "resistor" && r.value === "10k");
    expect(r10k?.qty).toBe(2);
    expect(r10k?.refs).toEqual(["R1", "R2"]);
    // distinct value => separate row
    expect(rows.filter((r) => r.symbolId === "resistor")).toHaveLength(2);
    expect(rows.find((r) => r.symbolId === "led")?.qty).toBe(1);
  });

  it("excludes power symbols (GND/VCC) as non-physical", () => {
    const rows = deriveBom([
      comp("gnd", "GND", "GND1"),
      comp("vcc", "+5V", "VCC1"),
      comp("resistor", "10k", "R1"),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.symbolId).toBe("resistor");
  });

  it("sorts references numerically (R2 before R10)", () => {
    const rows = deriveBom([
      comp("resistor", "10k", "R10"),
      comp("resistor", "10k", "R2"),
    ]);
    expect(rows[0]?.refs).toEqual(["R2", "R10"]);
  });

  it("computes line and grand totals", () => {
    const rows = deriveBom([
      comp("resistor", "10k", "R1"),
      comp("resistor", "10k", "R2"),
    ]);
    expect(rows[0]?.total).toBeCloseTo(0.04);
    expect(bomTotal(rows)).toBeCloseTo(0.04);
  });
});

describe("bomToCsv", () => {
  it("emits a header and one row per part, refs semicolon-joined", () => {
    const csv = bomToCsv(deriveBom([comp("resistor", "10k", "R1"), comp("resistor", "10k", "R2")]));
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("Ref,Value,Package,Description,Qty,Unit,Total");
    expect(lines[1]).toContain("R1;R2");
    expect(lines[1]).toContain("10k");
  });

  it("quotes cells containing commas", () => {
    const csv = bomToCsv([
      {
        refs: ["U1"],
        value: "reg, 3.3v",
        symbolId: "regulator",
        package_: "SOT-223",
        description: "Voltage regulator",
        qty: 1,
        unitPrice: 0.35,
        total: 0.35,
      },
    ]);
    expect(csv).toContain('"reg, 3.3v"');
  });
});
