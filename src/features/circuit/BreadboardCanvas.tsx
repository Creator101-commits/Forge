import { clsx } from "clsx";
import { Trash2 } from "lucide-react";
import {
  useBreadboardStore,
  computeNets,
  JUMPER_COLORS,
  type Hole,
} from "@/store/breadboard";

const NET_HUES = [200, 30, 140, 280, 0, 320, 90, 250];

/** Breadboard editor (M5): tie-point grid, power rails, and colored jumpers. */
export function BreadboardCanvas() {
  const holes = useBreadboardStore((s) => s.holes);
  const jumpers = useBreadboardStore((s) => s.jumpers);
  const pendingFrom = useBreadboardStore((s) => s.pendingFrom);
  const color = useBreadboardStore((s) => s.color);
  const selectedJumper = useBreadboardStore((s) => s.selectedJumper);

  const nets = computeNets(holes, jumpers);
  const byId = new Map(holes.map((h) => [h.id, h]));
  const width = Math.max(...holes.map((h) => h.x)) + 30;
  const height = Math.max(...holes.map((h) => h.y)) + 30;

  function holeFill(h: Hole): string {
    if (pendingFrom === h.id) return "var(--warn)";
    // tint holes that share a jumper-connected net
    const involved = jumpers.some((j) => {
      const a = byId.get(j.from);
      const b = byId.get(j.to);
      return (a && a.node === h.node) || (b && b.node === h.node);
    });
    if (involved) {
      const idx = nets.get(h.node) ?? 0;
      return `hsl(${NET_HUES[idx % NET_HUES.length]} 70% 55%)`;
    }
    return "var(--border-2)";
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border-1 bg-bg-2 px-2 py-1">
        <span className="text-[10px] uppercase tracking-wider text-text-3">Jumper</span>
        {JUMPER_COLORS.map((c) => (
          <button
            key={c}
            aria-label={`jumper color ${c}`}
            onClick={() => useBreadboardStore.getState().setColor(c)}
            className={clsx(
              "h-4 w-4 rounded-full border",
              color === c ? "border-text-1" : "border-transparent",
            )}
            style={{ background: c }}
          />
        ))}
        <div className="flex-1" />
        {pendingFrom && <span className="text-[11px] text-accent">click a second hole</span>}
        {selectedJumper && (
          <button
            onClick={() => useBreadboardStore.getState().removeJumper(selectedJumper)}
            className="flex items-center gap-1 rounded-1 px-1.5 py-0.5 text-[11px] text-error hover:bg-error/10"
          >
            <Trash2 className="h-3 w-3" /> Remove jumper
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-bg-1 p-2">
        <svg data-testid="breadboard-canvas" width={width} height={height} className="select-none">
          {/* board substrate */}
          <rect
            x={10}
            y={10}
            width={width - 20}
            height={height - 20}
            rx={8}
            fill="var(--surface-1)"
            stroke="var(--border-1)"
          />
          {/* holes */}
          {holes.map((h) => (
            <circle
              key={h.id}
              data-testid={`hole-${h.id}`}
              cx={h.x}
              cy={h.y}
              r={pendingFrom === h.id ? 5 : 3}
              fill={holeFill(h)}
              style={{ cursor: "pointer" }}
              onClick={() => useBreadboardStore.getState().holeClick(h.id)}
            />
          ))}
          {/* jumpers */}
          {jumpers.map((j) => {
            const a = byId.get(j.from);
            const b = byId.get(j.to);
            if (!a || !b) return null;
            const selected = j.id === selectedJumper;
            return (
              <line
                key={j.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={j.color}
                strokeWidth={selected ? 5 : 3}
                strokeLinecap="round"
                style={{ cursor: "pointer" }}
                onClick={() => useBreadboardStore.getState().selectJumper(j.id)}
              />
            );
          })}
        </svg>
      </div>

      <div className="flex items-center gap-3 border-t border-border-1 px-3 py-1 text-[11px] text-text-3">
        <span>{jumpers.length} jumpers</span>
        <span>Click two holes to add a jumper · click a jumper to select</span>
      </div>
    </div>
  );
}
