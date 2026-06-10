import { useState } from "react";
import { Download, Search, AlertTriangle, DollarSign } from "lucide-react";

const MOCK_ROWS = [
  { ref: "R1,R2", value: "10kΩ", package_: "0805", desc: "Resistor", qty: 2, price: 0.02, total: 0.04 },
  { ref: "C1,C2,C3", value: "100nF", package_: "0603", desc: "Ceramic capacitor", qty: 3, price: 0.05, total: 0.15 },
  { ref: "U1", value: "ATmega328P", package_: "DIP-28", desc: "Microcontroller", qty: 1, price: 2.50, total: 2.50 },
  { ref: "J1", value: "Header 6-pin", package_: "2.54mm", desc: "Pin header", qty: 1, price: 0.30, total: 0.30 },
];

export function BomWorkspace() {
  const [filter, setFilter] = useState("");
  const rows = MOCK_ROWS.filter((r) =>
    !filter || r.value.toLowerCase().includes(filter.toLowerCase()) || r.desc.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <section data-testid="workspace-bom" className="flex h-full flex-col bg-bg-1">
      <div className="flex items-center gap-2 border-b border-border-1 px-3 py-1.5">
        <Search className="h-3.5 w-3.5 text-text-3" />
        <input
          placeholder="Filter BOM..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input w-48 py-0.5 text-xs"
        />
        <div className="flex-1" />
        <button className="btn-ghost flex items-center gap-1 text-xs" title="Export CSV">
          <Download className="h-3 w-3" /> Export
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-bg-2 text-text-3 uppercase tracking-wider text-[10px]">
            <tr>
              {["Ref", "Value", "Package", "Description", "Qty", "Unit $", "Total $"].map((h) => (
                <th key={h} className="text-left px-3 py-1.5 border-b border-border-1 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border-1 hover:bg-surface-1">
                <td className="px-3 py-1.5 text-text-1 font-mono">{r.ref}</td>
                <td className="px-3 py-1.5 text-text-1">{r.value}</td>
                <td className="px-3 py-1.5 text-text-2 font-mono">{r.package_}</td>
                <td className="px-3 py-1.5 text-text-2">{r.desc}</td>
                <td className="px-3 py-1.5 text-text-1">{r.qty}</td>
                <td className="px-3 py-1.5 text-text-2">${r.price.toFixed(2)}</td>
                <td className="px-3 py-1.5 text-text-1 font-medium">${r.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex items-center justify-center py-12 text-text-3 text-xs">No BOM items match the filter.</div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border-1 px-3 py-1 text-[11px] text-text-3">
        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Total: ${rows.reduce((s, r) => s + r.total, 0).toFixed(2)}</span>
        <span>{rows.length} unique parts</span>
        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> 0 sourcing warnings</span>
      </div>
    </section>
  );
}
