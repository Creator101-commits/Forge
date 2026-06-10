import { useState } from "react";
import { Download, FileCode, FileImage, FileArchive, Package, Check, Loader2 } from "lucide-react";

interface ExportTarget {
  id: string;
  label: string;
  icon: typeof Download;
  description: string;
  format: string;
}

const TARGETS: ExportTarget[] = [
  {
    id: "bom-csv",
    label: "BOM (CSV)",
    icon: FileCode,
    description: "Bill of materials as CSV spreadsheet",
    format: ".csv",
  },
  {
    id: "bom-pdf",
    label: "BOM (PDF)",
    icon: FileCode,
    description: "Bill of materials as PDF document",
    format: ".pdf",
  },
  {
    id: "schematic-svg",
    label: "Schematic (SVG)",
    icon: FileImage,
    description: "Vector schematic diagram",
    format: ".svg",
  },
  {
    id: "pcb-gerber",
    label: "PCB Gerbers",
    icon: FileArchive,
    description: "Manufacturing files (RS-274X)",
    format: ".zip",
  },
  {
    id: "cad-screenshot",
    label: "CAD Screenshot",
    icon: FileImage,
    description: "Viewport screenshot at current camera",
    format: ".png",
  },
  {
    id: "project-bundle",
    label: "Project Bundle",
    icon: Package,
    description: "Complete project archive with sources",
    format: ".zip",
  },
];

export function ExportWorkspace() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const startExport = async (id: string) => {
    setExporting(id);
    // Simulate export delay (actual export is a Rust Tauri command)
    await new Promise((r) => setTimeout(r, 1200));
    setDone(new Set(done).add(id));
    setExporting(null);
  };

  return (
    <section
      data-testid="workspace-export"
      className="mx-auto flex h-full w-full max-w-2xl flex-col gap-4 overflow-auto p-8"
    >
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl text-text-1">Export</h1>
        <p className="text-sm text-text-3">Generate manufacturing and documentation artifacts.</p>
      </header>

      <div className="grid gap-2">
        {TARGETS.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-2 border border-border-1 bg-surface-1 px-4 py-3"
          >
            <t.icon className="h-5 w-5 shrink-0 text-text-3" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-1">{t.label}</div>
              <div className="text-xs text-text-3">{t.description}</div>
            </div>
            {done.has(t.id) ? (
              <span className="flex items-center gap-1 text-xs text-ok">
                <Check className="h-3.5 w-3.5" /> Exported
              </span>
            ) : (
              <button
                onClick={() => void startExport(t.id)}
                disabled={exporting !== null}
                className="btn-accent flex items-center gap-1 text-xs"
              >
                {exporting === t.id ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3" /> Export {t.format}
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-text-3">
        Exports are saved to the project&apos;s{" "}
        <code className="rounded-1 bg-bg-2 px-1">exports/</code> folder.
      </p>
    </section>
  );
}
