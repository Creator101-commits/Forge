import { useState } from "react";
import { clsx } from "clsx";
import { Grid3X3, MousePointer2, PenLine, Plus, Trash2, AlertTriangle } from "lucide-react";

type Mode = "schematic" | "breadboard" | "block" | "ladder";

export function CircuitWorkspace() {
  const [mode, setMode] = useState<Mode>("schematic");

  const modes: { id: Mode; label: string }[] = [
    { id: "schematic", label: "Schematic" },
    { id: "breadboard", label: "Breadboard" },
    { id: "block", label: "Block Diagram" },
    { id: "ladder", label: "Ladder" },
  ];

  return (
    <section
      data-testid="workspace-circuit"
      className="flex h-full flex-col bg-bg-1"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border-1 px-2 py-1">
        {/* Mode switcher */}
        <div role="group" className="flex rounded-1 border border-border-1 bg-bg-2 p-0.5 mr-2">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={clsx(
                "rounded-1 px-2 py-0.5 text-[11px] transition-colors",
                mode === m.id ? "bg-accent text-[#04211d]" : "text-text-3 hover:text-text-1"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border-1 mx-1" />

        {/* Tools */}
        <ToolButton icon={MousePointer2} label="Select" active />
        <ToolButton icon={Plus} label="Add component" />
        <ToolButton icon={PenLine} label="Wire" />
        <ToolButton icon={Trash2} label="Delete" />

        <div className="flex-1" />

        {/* Grid toggle */}
        <button className="rounded-1 p-1 text-text-3 hover:text-text-1" title="Toggle grid">
          <Grid3X3 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden relative">
        {mode === "schematic" && <SchematicCanvas />}
        {mode === "breadboard" && <BreadboardCanvas />}
        {mode === "block" && <BlockCanvas />}
        {mode === "ladder" && <LadderCanvas />}
      </div>

      {/* Status bar for this workspace */}
      <div className="flex items-center gap-3 border-t border-border-1 px-3 py-1 text-[11px] text-text-3">
        <span>Mode: {mode}</span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> 0 ERC issues
        </span>
        <span>Grid: 0.1"</span>
      </div>
    </section>
  );
}

function ToolButton({ icon: Icon, label, active }: { icon: typeof MousePointer2; label: string; active?: boolean }) {
  return (
    <button
      className={clsx(
        "rounded-1 p-1.5 transition-colors",
        active ? "bg-accent/15 text-accent" : "text-text-3 hover:text-text-1"
      )}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function SchematicCanvas() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-text-3">
        <svg width="200" height="200" className="opacity-20">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="200" height="200" fill="url(#grid)" />
        </svg>
        <div className="text-center text-xs">
          <p className="text-text-2 font-medium">Schematic Editor</p>
          <p>Drag components from the symbol palette to start building.</p>
          <p className="mt-1 text-text-3">Symbol library loads in the left sidebar.</p>
        </div>
      </div>
    </div>
  );
}

function BreadboardCanvas() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-text-3">
      <div className="text-center">
        <p className="text-text-2 font-medium">Breadboard View</p>
        <p>Visual breadboard layout with tie-point grid and jump wires.</p>
        <p className="mt-1">Switch back to Schematic mode to edit components.</p>
      </div>
    </div>
  );
}

function BlockCanvas() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-text-3">
      <div className="text-center">
        <p className="text-text-2 font-medium">Block Diagram</p>
        <p>High-level system blocks with directional connections.</p>
        <p className="mt-1">Drag blocks and connect ports to design architecture.</p>
      </div>
    </div>
  );
}

function LadderCanvas() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-text-3">
      <div className="text-center">
        <p className="text-text-2 font-medium">Ladder Diagram</p>
        <p>PLC-style ladder logic with contacts, coils, and rungs.</p>
        <p className="mt-1">Add contacts and coils on each rung to build logic.</p>
      </div>
    </div>
  );
}
