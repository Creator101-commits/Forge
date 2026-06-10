import { useState } from "react";
import { clsx } from "clsx";
import { MousePointer2, PenLine, Plus, Trash2, AlertTriangle, Grid3X3, Eye, EyeOff } from "lucide-react";

const LAYERS = ["Top Copper", "Bottom Copper", "Silkscreen", "Soldermask", "Outline", "Drills"];

export function PcbWorkspace() {
  const [activeLayer, setActiveLayer] = useState("Top Copper");
  const [visibleLayers, setVisibleLayers] = useState(new Set(LAYERS));

  const toggleLayer = (layer: string) => {
    const next = new Set(visibleLayers);
    if (next.has(layer)) next.delete(layer); else next.add(layer);
    setVisibleLayers(next);
  };

  return (
    <section data-testid="workspace-pcb" className="flex h-full flex-col bg-bg-1">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border-1 px-2 py-1">
        <ToolButton icon={MousePointer2} label="Select" active />
        <ToolButton icon={Plus} label="Place footprint" />
        <ToolButton icon={PenLine} label="Route trace" />
        <ToolButton icon={Trash2} label="Delete" />
        <div className="h-5 w-px bg-border-1 mx-1" />
        <button className="rounded-1 p-1 text-text-3 hover:text-text-1" title="Toggle grid">
          <Grid3X3 className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-text-3">{activeLayer}</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Layer panel */}
        <aside className="w-40 shrink-0 border-r border-border-1 bg-bg-2 p-2 flex flex-col gap-1">
          <div className="text-[10px] uppercase tracking-wider text-text-3 mb-1">Layers</div>
          {LAYERS.map((l) => (
            <button
              key={l}
              onClick={() => setActiveLayer(l)}
              className={clsx(
                "flex items-center gap-1.5 rounded-1 px-2 py-1 text-[11px] text-left transition-colors",
                activeLayer === l ? "bg-accent/15 text-accent" : "text-text-2 hover:bg-surface-1"
              )}
            >
              <button onClick={(e) => { e.stopPropagation(); toggleLayer(l); }} className="p-0.5">
                {visibleLayers.has(l) ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 opacity-50" />}
              </button>
              <span className={visibleLayers.has(l) ? "" : "opacity-50"}>{l}</span>
            </button>
          ))}
        </aside>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-bg-0">
          <div className="flex flex-col items-center gap-3 text-text-3">
            <svg width="300" height="200" className="opacity-10">
              <defs>
                <pattern id="pcb-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.3" />
                </pattern>
              </defs>
              <rect width="300" height="200" fill="url(#pcb-grid)" />
              <rect x="60" y="30" width="180" height="140" rx="4" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
            <div className="text-center text-xs">
              <p className="text-text-2 font-medium">PCB Editor</p>
              <p>Place footprints, route traces, and define board outline.</p>
              <p className="mt-1 text-text-3">Footprint library loads in the left sidebar.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border-1 px-3 py-1 text-[11px] text-text-3">
        <span>Board: 50×30mm</span>
        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> 0 DRC issues</span>
        <span>Grid: 0.1mm</span>
      </div>
    </section>
  );
}

function ToolButton({ icon: Icon, label, active }: { icon: typeof MousePointer2; label: string; active?: boolean }) {
  return (
    <button className={clsx("rounded-1 p-1.5 transition-colors", active ? "bg-accent/15 text-accent" : "text-text-3 hover:text-text-1")} title={label}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
