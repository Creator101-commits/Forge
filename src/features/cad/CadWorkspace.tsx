import { useState } from "react";
import { clsx } from "clsx";
import { Box, MousePointer2, Move, RotateCcw, Plus, Trash2, Maximize, Grid3X3 } from "lucide-react";

const VIEWS = ["Perspective", "Top", "Front", "Right"];

export function CadWorkspace() {
  const [view, setView] = useState("Perspective");

  return (
    <section data-testid="workspace-cad" className="flex h-full flex-col bg-bg-1">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border-1 px-2 py-1">
        <ToolButton icon={MousePointer2} label="Select" active />
        <ToolButton icon={Move} label="Move" />
        <ToolButton icon={RotateCcw} label="Rotate" />
        <ToolButton icon={Maximize} label="Scale" />
        <ToolButton icon={Plus} label="Add primitive" />
        <ToolButton icon={Trash2} label="Delete" />
        <div className="h-5 w-px bg-border-1 mx-1" />
        <button className="rounded-1 p-1 text-text-3 hover:text-text-1" title="Toggle grid">
          <Grid3X3 className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1" />
        <div role="group" className="flex rounded-1 border border-border-1 bg-bg-2 p-0.5">
          {VIEWS.map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={clsx("rounded-1 px-2 py-0.5 text-[11px]", view === v ? "bg-accent text-[#04211d]" : "text-text-3 hover:text-text-1")}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Object tree */}
        <aside className="w-48 shrink-0 border-r border-border-1 bg-bg-2 p-2 flex flex-col">
          <div className="text-[10px] uppercase tracking-wider text-text-3 mb-2">Scene</div>
          <div className="flex flex-col gap-0.5 text-xs text-text-2">
            <div className="rounded-1 px-2 py-0.5 hover:bg-surface-1 cursor-pointer">📦 Assembly</div>
            <div className="rounded-1 px-2 py-0.5 hover:bg-surface-1 cursor-pointer ml-3">🔲 Board</div>
            <div className="rounded-1 px-2 py-0.5 hover:bg-surface-1 cursor-pointer ml-3">🔲 Enclosure</div>
            <div className="rounded-1 px-2 py-0.5 hover:bg-surface-1 cursor-pointer">📦 Hardware</div>
          </div>
        </aside>

        {/* Viewport */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-bg-0">
          <div className="flex flex-col items-center gap-3 text-text-3">
            <Box className="h-16 w-16 opacity-10" />
            <div className="text-center text-xs">
              <p className="text-text-2 font-medium">3D CAD Viewport</p>
              <p>Three.js renderer with orbit controls, gizmos, and snapping.</p>
              <p className="mt-1 text-text-3">Add primitives from the toolbar or import models.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border-1 px-3 py-1 text-[11px] text-text-3">
        <span>View: {view}</span>
        <span>Objects: 0</span>
        <span>Units: mm</span>
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
