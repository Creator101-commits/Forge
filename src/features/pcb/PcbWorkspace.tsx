import { useState } from "react";
import { clsx } from "clsx";
import {
  MousePointer2,
  PenLine,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  Eye,
  EyeOff,
  Layers,
  Cpu,
} from "lucide-react";
import { usePcbStore, type LayerId } from "@/store/pcb";
import { PcbCanvas } from "@/features/pcb/PcbCanvas";
import { FOOTPRINTS } from "@/features/pcb/footprints";

const LAYER_NAMES: { display: string; id: LayerId }[] = [
  { display: "Top Copper", id: "top" },
  { display: "Bottom Copper", id: "bottom" },
  { display: "Silkscreen", id: "silk" },
  { display: "Outline", id: "outline" },
];

export function PcbWorkspace() {
  const activeLayer = usePcbStore((s) => s.activeLayer);
  const layerVisible = usePcbStore((s) => s.layerVisible);
  const setActiveLayer = usePcbStore((s) => s.setActiveLayer);
  const toggleLayer = usePcbStore((s) => s.toggleLayer);
  const tool = usePcbStore((s) => s.tool);
  const setTool = usePcbStore((s) => s.setTool);
  const armPlace = usePcbStore((s) => s.armPlace);
  const board = usePcbStore((s) => s.board);
  const drc = usePcbStore((s) => s.drc);
  const runDrc = usePcbStore((s) => s.runDrc);
  const [drcExpanded, setDrcExpanded] = useState(false);

  return (
    <section data-testid="workspace-pcb" className="flex h-full flex-col bg-bg-1">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border-1 px-2 py-1">
        <ToolButton
          icon={MousePointer2}
          label="Select"
          active={tool === "select"}
          onClick={() => setTool("select")}
        />
        <ToolButton
          icon={Plus}
          label="Place footprint"
          active={tool === "place"}
          onClick={() => setTool("place")}
        />
        <ToolButton
          icon={PenLine}
          label="Route trace"
          active={tool === "route"}
          onClick={() => setTool("route")}
        />
        <ToolButton
          icon={Trash2}
          label="Delete"
          active={tool === "delete"}
          onClick={() => setTool("delete")}
        />
        <div className="mx-1 h-5 w-px bg-border-1" />
        <button
          className="rounded-1 p-1 text-text-3 hover:text-text-1 focus-visible:ring-2 focus-visible:ring-accent"
          title="Toggle grid"
        >
          <Grid3X3 className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1" />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Layers panel */}
        <aside className="flex w-40 shrink-0 flex-col gap-1 border-r border-border-1 bg-bg-2 p-2">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-3">
            <Layers className="h-3 w-3" />
            Layers
          </div>
          {LAYER_NAMES.map(({ display, id }) => (
            <button
              key={display}
              onClick={() => setActiveLayer(id)}
              className={clsx(
                "flex items-center gap-1.5 rounded-1 px-2 py-1 text-[11px] text-left transition-colors focus-visible:ring-2 focus-visible:ring-accent",
                activeLayer === id
                  ? "bg-accent/15 text-accent"
                  : "text-text-2 hover:bg-surface-1",
              )}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayer(id);
                }}
                className="rounded-1 p-0.5 focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={`Toggle ${display} visibility`}
              >
                {layerVisible[id] ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3 opacity-50" />
                )}
              </button>
              <span className={layerVisible[id] ? "" : "opacity-50"}>{display}</span>
            </button>
          ))}
        </aside>

        {/* Canvas */}
        <div className="flex flex-1 overflow-hidden">
          <PcbCanvas />
        </div>

        {/* Footprint palette */}
        <aside className="flex w-40 shrink-0 flex-col gap-1 border-l border-border-1 bg-bg-2 p-2">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-3">
            <Cpu className="h-3 w-3" />
            Footprints
          </div>
          {FOOTPRINTS.map((fp) => (
            <button
              key={fp.id}
              onClick={() => armPlace(fp.id)}
              className="flex items-center gap-1.5 rounded-1 px-2 py-1 text-[11px] text-left text-text-2 transition-colors hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-accent"
              title={`Place ${fp.name}`}
            >
              {fp.name}
            </button>
          ))}
        </aside>
      </div>

      {/* Status bar */}
      <div className="flex flex-col border-t border-border-1">
        <div className="flex items-center gap-3 px-3 py-1 text-[11px] text-text-3">
          <span>
            Board: {board.width}×{board.height}mm
          </span>
          <button
            onClick={() => setDrcExpanded(!drcExpanded)}
            className="flex items-center gap-1 hover:text-text-1"
          >
            {drcExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <AlertTriangle className="h-3 w-3" />
            {drc.length} DRC issues
          </button>
          <span>Grid: 0.1mm</span>
          <div className="flex-1" />
        </div>
        {drcExpanded && (
          <div className="max-h-32 overflow-y-auto border-t border-border-1 px-3 py-1">
            {drc.length === 0 ? (
              <p className="py-0.5 text-[11px] text-text-3">No DRC issues.</p>
            ) : (
              drc.map((issue, i) => (
                <div
                  key={i}
                  className={clsx(
                    "flex items-center gap-2 py-0.5 text-[11px]",
                    issue.severity === "Error" ? "text-red-400" : "text-yellow-400",
                  )}
                >
                  <span className="font-medium">{issue.severity}</span>
                  <span>{issue.message}</span>
                </div>
              ))
            )}
          </div>
        )}
        <button
          onClick={() => runDrc()}
          className="self-start px-3 py-0.5 text-[10px] text-text-3 hover:text-text-1"
        >
          Run DRC
        </button>
      </div>
    </section>
  );
}

function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof MousePointer2;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={clsx(
        "rounded-1 p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-accent",
        active ? "bg-accent/15 text-accent" : "text-text-3 hover:text-text-1",
      )}
      title={label}
      type="button"
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
