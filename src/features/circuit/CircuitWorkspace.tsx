import { clsx } from "clsx";
import {
  Grid3X3,
  MousePointer2,
  PenLine,
  Trash2,
  AlertTriangle,
  RotateCw,
  FlipHorizontal2,
} from "lucide-react";
import { useCircuitStore, type CircuitMode } from "@/store/circuit";
import { SchematicCanvas } from "./SchematicCanvas";
import { BlockCanvas } from "./BlockCanvas";
import { BreadboardCanvas } from "./BreadboardCanvas";
import { LadderCanvas } from "./LadderCanvas";

const MODES: { id: CircuitMode; label: string }[] = [
  { id: "schematic", label: "Schematic" },
  { id: "breadboard", label: "Breadboard" },
  { id: "block", label: "Block Diagram" },
  { id: "ladder", label: "Ladder" },
];

export function CircuitWorkspace() {
  const mode = useCircuitStore((s) => s.mode);
  const setMode = useCircuitStore((s) => s.setMode);
  const tool = useCircuitStore((s) => s.tool);
  const setTool = useCircuitStore((s) => s.setTool);
  const selectedId = useCircuitStore((s) => s.selectedId);
  const rotate = useCircuitStore((s) => s.rotateComponent);
  const mirror = useCircuitStore((s) => s.mirrorComponent);
  const erc = useCircuitStore((s) => s.erc);
  const componentCount = useCircuitStore((s) => s.components.length);

  return (
    <section data-testid="workspace-circuit" className="flex h-full flex-col bg-bg-1">
      <div className="flex items-center gap-1 border-b border-border-1 px-2 py-1">
        <div
          role="group"
          aria-label="Circuit mode"
          className="mr-2 flex rounded-1 border border-border-1 bg-bg-2 p-0.5"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={clsx(
                "rounded-1 px-2 py-0.5 text-[11px] transition-colors",
                mode === m.id ? "bg-accent text-[#04211d]" : "text-text-3 hover:text-text-1",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mx-1 h-5 w-px bg-border-1" />

        <ToolButton
          icon={MousePointer2}
          label="Select"
          active={tool === "select"}
          onClick={() => setTool("select")}
        />
        <ToolButton
          icon={PenLine}
          label="Wire"
          active={tool === "wire"}
          onClick={() => setTool("wire")}
        />
        <ToolButton
          icon={Trash2}
          label="Delete"
          active={tool === "delete"}
          onClick={() => setTool("delete")}
        />

        <div className="mx-1 h-5 w-px bg-border-1" />

        <ToolButton
          icon={RotateCw}
          label="Rotate selection"
          disabled={!selectedId}
          onClick={() => selectedId && rotate(selectedId)}
        />
        <ToolButton
          icon={FlipHorizontal2}
          label="Mirror selection"
          disabled={!selectedId}
          onClick={() => selectedId && mirror(selectedId)}
        />

        <div className="flex-1" />
        <Grid3X3 className="h-3.5 w-3.5 text-text-3" />
      </div>

      <div className="relative flex-1 overflow-hidden">
        {mode === "schematic" && <SchematicCanvas />}
        {mode === "block" && <BlockCanvas />}
        {mode === "breadboard" && <BreadboardCanvas />}
        {mode === "ladder" && <LadderCanvas />}
      </div>

      <div className="flex items-center gap-3 border-t border-border-1 px-3 py-1 text-[11px] text-text-3">
        <span>Mode: {mode}</span>
        <span>{componentCount} components</span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {erc.length} ERC issue{erc.length !== 1 ? "s" : ""}
        </span>
        <span>Grid: 0.1&quot;</span>
        {tool === "wire" && <span className="text-accent">Wire: click pin → click pin</span>}
        {tool === "place" && <span className="text-accent">Place: click on canvas</span>}
      </div>
    </section>
  );
}

function ToolButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: typeof MousePointer2;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "rounded-1 p-1.5 transition-colors disabled:opacity-30",
        active ? "bg-accent/15 text-accent" : "text-text-3 hover:text-text-1",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
