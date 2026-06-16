import { useState, useCallback } from "react";
import { clsx } from "clsx";
import {
  Download,
  FileCode,
  FileImage,
  FileArchive,
  Package,
  Check,
  Loader2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import * as ipc from "@/lib/ipc";

interface ExportTarget {
  id: string;
  label: string;
  icon: typeof Download;
  description: string;
  format: string;
  handler: () => Promise<string>;
}

type ExportStatus = "idle" | "exporting" | "done" | "error";

interface ExportState {
  status: ExportStatus;
  filename: string | null;
  error: string | null;
  warnings: string[];
}

const TARGETS: ExportTarget[] = [
  {
    id: "bom-csv",
    label: "BOM (CSV)",
    icon: FileCode,
    description: "Bill of materials as CSV spreadsheet",
    format: ".csv",
    handler: () => ipc.exportBomCsv(),
  },
  {
    id: "bom-pdf",
    label: "BOM (PDF)",
    icon: FileCode,
    description: "Bill of materials as PDF document",
    format: ".pdf",
    handler: () => ipc.exportBomPdf(),
  },
  {
    id: "schematic-svg",
    label: "Schematic (SVG)",
    icon: FileImage,
    description: "Vector schematic diagram",
    format: ".svg",
    handler: () => ipc.exportSchematicSvg(),
  },
  {
    id: "pcb-gerber",
    label: "PCB Gerbers",
    icon: FileArchive,
    description: "Manufacturing files (RS-274X)",
    format: ".zip",
    handler: () => ipc.exportPcbGerbers(),
  },
  {
    id: "cad-screenshot",
    label: "CAD Screenshot",
    icon: FileImage,
    description: "Viewport screenshot at current camera",
    format: ".png",
    handler: () => ipc.exportCadScreenshot(),
  },
  {
    id: "project-bundle",
    label: "Project Bundle",
    icon: Package,
    description: "Complete project archive with sources",
    format: ".zip",
    handler: () => ipc.exportProjectBundle(),
  },
];

function emptyState(): ExportState {
  return { status: "idle", filename: null, error: null, warnings: [] };
}

async function getWarnings(targetId: string): Promise<string[]> {
  const warnings: string[] = [];
  try {
    switch (targetId) {
      case "bom-csv":
      case "bom-pdf": {
        const items = await ipc.bomGenerate();
        if (items.length === 0) warnings.push("No components in schematic — BOM will be empty");
        break;
      }
      case "schematic-svg": {
        const comps = await ipc.circuitListComponents();
        if (comps.length === 0) warnings.push("No schematic data — SVG will be blank");
        break;
      }
      case "pcb-gerber": {
        const fps = await ipc.pcbListFootprints();
        if (fps.length === 0) warnings.push("No PCB footprints placed — Gerbers will be empty");
        break;
      }
      case "cad-screenshot": {
        const objs = await ipc.cadListObjects();
        if (objs.length === 0) warnings.push("No CAD objects in scene — screenshot will be blank");
        break;
      }
    }
  } catch {
    /* IPC validation unavailable; proceed with export */
  }
  return warnings;
}

const INITIAL_DIR = "exports/";

export function ExportWorkspace() {
  const [states, setStates] = useState<Record<string, ExportState>>(() =>
    Object.fromEntries(TARGETS.map((t) => [t.id, emptyState()])),
  );
  const [exportDir, setExportDir] = useState<string>(INITIAL_DIR);
  const [exportingAll, setExportingAll] = useState(false);

  const updateTarget = useCallback((id: string, patch: Partial<ExportState>) => {
    setStates((prev) => ({
      ...prev,
      [id]: { ...emptyState(), ...prev[id], ...patch },
    }));
  }, []);

  const startExport = useCallback(
    async (target: ExportTarget) => {
      updateTarget(target.id, { status: "exporting", error: null, filename: null, warnings: [] });

      const warnings = await getWarnings(target.id);
      if (warnings.length > 0) {
        updateTarget(target.id, { warnings });
      }

      try {
        const path = await target.handler();
        const filename = path.split("/").pop() ?? path;
        updateTarget(target.id, { status: "done", filename, error: null });
        const dir = path.includes("/") ? path.split("/").slice(0, -1).join("/") : INITIAL_DIR;
        setExportDir(dir);
      } catch (err: unknown) {
        const fe = ipc.parseForgeError(err);
        updateTarget(target.id, { status: "error", error: fe.message, filename: null });
      }
    },
    [updateTarget],
  );

  const retryExport = useCallback(
    (target: ExportTarget) => {
      void startExport(target);
    },
    [startExport],
  );

  const exportAll = useCallback(async () => {
    setExportingAll(true);
    for (const target of TARGETS) {
      await startExport(target);
    }
    setExportingAll(false);
  }, [startExport]);

  const anyExporting =
    Object.values(states).some((s) => s.status === "exporting") || exportingAll;

  return (
    <section
      data-testid="workspace-export"
      className="mx-auto flex h-full w-full max-w-2xl flex-col gap-4 overflow-auto p-8"
    >
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl text-text-1">Export</h1>
        <p className="text-sm text-text-3">Generate manufacturing and documentation artifacts.</p>
      </header>

      {/* Export directory */}
      <div className="flex items-center gap-2 rounded-2 border border-border-1 bg-surface-1 px-4 py-2 text-xs text-text-2">
        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate font-mono">{exportDir}</span>
        <button
          className="btn-ghost flex items-center gap-1 text-xs"
          title="Open export folder"
          onClick={async () => {
            try {
              await ipc.invoke("open_export_folder");
            } catch { /* not available */ }
          }}
        >
          <ExternalLink className="h-3 w-3" /> Open
        </button>
      </div>

      {/* Export targets */}
      <div className="grid gap-2">
        {TARGETS.map((t) => {
          const s = states[t.id] ?? emptyState();
          return (
            <div
              key={t.id}
              className={clsx(
                "flex flex-col rounded-2 border bg-surface-1",
                s.status === "error"
                  ? "border-error/40"
                  : s.status === "done"
                    ? "border-ok/40"
                    : "border-border-1",
              )}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <t.icon className="h-5 w-5 shrink-0 text-text-3" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text-1">{t.label}</div>
                  <div className="text-xs text-text-3">{t.description}</div>
                </div>

                {s.status === "done" ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="flex items-center gap-1 text-xs text-ok">
                      <Check className="h-3.5 w-3.5" /> Exported
                    </span>
                    {s.filename && (
                      <span className="max-w-[160px] truncate text-[10px] text-text-3" title={s.filename}>
                        {s.filename}
                      </span>
                    )}
                  </div>
                ) : s.status === "error" ? (
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-1 text-xs text-error">
                      <XCircle className="h-3.5 w-3.5" /> Failed
                    </span>
                    <button
                      onClick={() => retryExport(t)}
                      className="btn-ghost p-0.5"
                      title="Retry export"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => void startExport(t)}
                    disabled={anyExporting}
                    className="btn-accent flex items-center gap-1 text-xs"
                  >
                    {s.status === "exporting" ? (
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

              {/* Warnings */}
              {s.warnings.length > 0 && s.status !== "done" && (
                <div className="flex items-start gap-2 border-t border-border-1 px-4 py-2">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warn" />
                  <ul className="space-y-0.5">
                    {s.warnings.map((w, i) => (
                      <li key={i} className="text-[11px] text-warn">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error detail */}
              {s.status === "error" && s.error && (
                <div className="flex items-start gap-2 border-t border-border-1 px-4 py-2">
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-error" />
                  <p className="text-[11px] text-error">{s.error}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Export Everything */}
      <button
        onClick={() => void exportAll()}
        disabled={anyExporting}
        className={clsx(
          "flex items-center justify-center gap-2 rounded-2 px-4 py-2 text-sm font-medium transition-colors",
          anyExporting
            ? "cursor-not-allowed opacity-50"
            : "bg-accent text-[#04211d] hover:bg-accent/90",
        )}
      >
        {exportingAll ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Exporting all targets...
          </>
        ) : (
          <>
            <Package className="h-4 w-4" /> Export Everything
          </>
        )}
      </button>
    </section>
  );
}
