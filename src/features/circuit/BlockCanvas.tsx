import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { clsx } from "clsx";
import { Plus, Trash2, Link2 } from "lucide-react";
import {
  useBlocksStore,
  BLOCK_COLORS,
  type Block,
  type BlockCategory,
} from "@/store/blocks";

const CATEGORIES: { id: BlockCategory; label: string }[] = [
  { id: "power", label: "Power" },
  { id: "mcu", label: "MCU" },
  { id: "sensor", label: "Sensor" },
  { id: "actuator", label: "Actuator" },
  { id: "comms", label: "Comms" },
  { id: "generic", label: "Block" },
];

function center(b: Block): [number, number] {
  return [b.x + b.width / 2, b.y + b.height / 2];
}

/** Block-diagram editor (M5): add categorized blocks, drag, and connect them. */
export function BlockCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const blocks = useBlocksStore((s) => s.blocks);
  const connections = useBlocksStore((s) => s.connections);
  const selectedId = useBlocksStore((s) => s.selectedId);
  const connectFrom = useBlocksStore((s) => s.connectFrom);

  function toLocal(clientX: number, clientY: number): [number, number] {
    const r = svgRef.current?.getBoundingClientRect();
    return r ? [clientX - r.left, clientY - r.top] : [0, 0];
  }

  function onBlockPointerDown(e: ReactPointerEvent, b: Block) {
    e.stopPropagation();
    const st = useBlocksStore.getState();
    if (st.connectFrom) {
      st.completeConnect(b.id);
      return;
    }
    st.select(b.id);
    const [lx, ly] = toLocal(e.clientX, e.clientY);
    dragRef.current = { id: b.id, dx: lx - b.x, dy: ly - b.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const [lx, ly] = toLocal(e.clientX, e.clientY);
    useBlocksStore.getState().moveBlock(d.id, lx - d.dx, ly - d.dy);
  }

  function onPointerUp(e: ReactPointerEvent) {
    dragRef.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border-1 bg-bg-2 px-2 py-1">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-text-3">Add</span>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => useBlocksStore.getState().addBlock(c.id, 60 + blocks.length * 20, 60)}
            className="flex items-center gap-1 rounded-1 border border-border-1 px-1.5 py-0.5 text-[11px] text-text-2 hover:border-border-2 hover:text-text-1"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: BLOCK_COLORS[c.id] }}
            />
            <Plus className="h-2.5 w-2.5" /> {c.label}
          </button>
        ))}
        <div className="flex-1" />
        {connectFrom && (
          <span className="flex items-center gap-1 text-[11px] text-accent">
            <Link2 className="h-3 w-3" /> click a target block
          </span>
        )}
      </div>

      <svg
        ref={svgRef}
        data-testid="block-canvas"
        className="min-h-0 flex-1 bg-bg-1"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerDown={() => useBlocksStore.getState().select(null)}
      >
        <defs>
          <marker id="block-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--text-2)" />
          </marker>
        </defs>

        {connections.map((conn) => {
          const a = blocks.find((b) => b.id === conn.from);
          const b = blocks.find((bb) => bb.id === conn.to);
          if (!a || !b) return null;
          const [ax, ay] = center(a);
          const [bx, by] = center(b);
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2;
          return (
            <g key={conn.id}>
              <line
                x1={ax}
                y1={ay}
                x2={bx}
                y2={by}
                stroke="var(--text-2)"
                strokeWidth={1.5}
                markerEnd="url(#block-arrow)"
              />
              {conn.label && (
                <text x={mx} y={my - 4} textAnchor="middle" fontSize={10} fill="var(--text-3)">
                  {conn.label}
                </text>
              )}
            </g>
          );
        })}

        {blocks.map((b) => {
          const selected = b.id === selectedId;
          const isSource = b.id === connectFrom;
          return (
            <g
              key={b.id}
              data-testid={`block-${b.id}`}
              transform={`translate(${b.x},${b.y})`}
              onPointerDown={(e) => onBlockPointerDown(e, b)}
              style={{ cursor: "move" }}
            >
              <rect
                width={b.width}
                height={b.height}
                rx={6}
                fill="var(--surface-1)"
                stroke={selected || isSource ? "var(--accent)" : "var(--border-2)"}
                strokeWidth={selected || isSource ? 2 : 1}
              />
              <rect width={6} height={b.height} rx={3} fill={BLOCK_COLORS[b.category]} />
              <text
                x={b.width / 2 + 3}
                y={b.height / 2 + 4}
                textAnchor="middle"
                fontSize={12}
                fill="var(--text-1)"
              >
                {b.label}
              </text>
              <text x={b.width / 2 + 3} y={16} textAnchor="middle" fontSize={8} fill="var(--text-3)">
                {b.category}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-2 border-t border-border-1 px-3 py-1 text-[11px] text-text-3">
        <span>{blocks.length} blocks</span>
        <span>{connections.length} connections</span>
        {selectedId && (
          <>
            <button
              onClick={() => useBlocksStore.getState().beginConnect(selectedId)}
              className={clsx(
                "flex items-center gap-1 rounded-1 px-1.5 py-0.5",
                connectFrom === selectedId
                  ? "bg-accent/15 text-accent"
                  : "text-text-2 hover:text-text-1",
              )}
            >
              <Link2 className="h-3 w-3" /> Connect
            </button>
            <button
              onClick={() => useBlocksStore.getState().removeBlock(selectedId)}
              className="flex items-center gap-1 rounded-1 px-1.5 py-0.5 text-error hover:bg-error/10"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
