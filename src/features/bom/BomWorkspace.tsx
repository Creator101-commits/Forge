import { useMemo, useState } from "react";
import { Download, Search, AlertTriangle, DollarSign } from "lucide-react";
import { useCircuitStore } from "@/store/circuit";
import { deriveBom, bomToCsv, bomTotal } from "./deriveBom";

/**
 * BOM workspace (M8). Derives the bill of materials live from the schematic
 * components and exports CSV. When the Tauri backend is present, `bom_generate`
 * / `export_bom_csv` can replace the client-side derivation.
 */
export function BomWorkspace() {
  const [filter, setFilter] = useState("");
  const components = useCircuitStore((s) => s.components);

  const allRows = useMemo(() => deriveBom(components), [components]);
  const rows = allRows.filter(
    (r) =>
      !filter ||
      r.value.toLowerCase().includes(filter.toLowerCase()) ||
      r.description.toLowerCase().includes(filter.toLowerCase()) ||
      r.refs.join(",").toLowerCase().includes(filter.toLowerCase()),
  );

  const missingValue = allRows.filter((r) => !r.value.trim()).length;

  function exportCsv() {
    const csv = bomToCsv(allRows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forge-bom.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section data-testid="workspace-bom" className="flex h-full flex-col bg-bg-1">
      <div className="flex items-center gap-2 border-b border-border-1 px-3 py-1.5">
        <Search className="h-3.5 w-3.5 text-text-3" />
        <input
          aria-label="Filter BOM"
          placeholder="Filter BOM..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input w-48 py-0.5 text-xs"
        />
        <div className="flex-1" />
        <button
          onClick={exportCsv}
          disabled={allRows.length === 0}
          className="btn-ghost flex items-center gap-1 text-xs disabled:opacity-40"
          title="Export CSV"
        >
          <Download className="h-3 w-3" /> Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {allRows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-text-3">
            <p className="font-medium text-text-2">No parts yet</p>
            <p>Place components in the Circuit workspace — the BOM updates automatically.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-2 text-[10px] uppercase tracking-wider text-text-3">
              <tr>
                {["Ref", "Value", "Package", "Description", "Qty", "Unit $", "Total $"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-border-1 px-3 py-1.5 text-left font-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.symbolId}|${r.value}`}
                  className="border-b border-border-1 hover:bg-surface-1"
                >
                  <td className="px-3 py-1.5 font-mono text-text-1">{r.refs.join(", ")}</td>
                  <td className="px-3 py-1.5 text-text-1">{r.value || "—"}</td>
                  <td className="px-3 py-1.5 font-mono text-text-2">{r.package_}</td>
                  <td className="px-3 py-1.5 text-text-2">{r.description}</td>
                  <td className="px-3 py-1.5 text-text-1">{r.qty}</td>
                  <td className="px-3 py-1.5 text-text-2">${r.unitPrice.toFixed(2)}</td>
                  <td className="px-3 py-1.5 font-medium text-text-1">${r.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {allRows.length > 0 && rows.length === 0 && (
          <div className="flex items-center justify-center py-12 text-xs text-text-3">
            No BOM items match the filter.
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border-1 px-3 py-1 text-[11px] text-text-3">
        <span className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" /> Total: ${bomTotal(allRows).toFixed(2)}
        </span>
        <span>{allRows.length} unique parts</span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {missingValue} sourcing warning
          {missingValue !== 1 ? "s" : ""}
        </span>
      </div>
    </section>
  );
}
