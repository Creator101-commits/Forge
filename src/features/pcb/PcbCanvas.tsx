import { useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { usePcbStore, type Footprint, type LayerId } from "@/store/pcb";

const LAYER_COLOR: Record<LayerId, string> = {
  top: "#d9534f",
  bottom: "#3b82f6",
  silk: "#e6edf3",
  outline: "#f59e0b",
};

/** Interactive PCB canvas (M6): board outline, footprints/pads, traces, routing. */
export function PcbCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(8); // px per mm
  const [off, setOff] = useState<[number, number]>([40, 40]);
  const drag = useRef<{ kind: "pan" | "move"; id?: string; lx: number; ly: number } | null>(null);

  const footprints = usePcbStore((s) => s.footprints);
  const traces = usePcbStore((s) => s.traces);
  const board = usePcbStore((s) => s.board);
  const tool = usePcbStore((s) => s.tool);
  const placingLibId = usePcbStore((s) => s.placingLibId);
  const selectedId = usePcbStore((s) => s.selectedId);
  const routeFrom = usePcbStore((s) => s.routeFrom);
  const layerVisible = usePcbStore((s) => s.layerVisible);

  const toMM = (cx: number, cy: number): [number, number] => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return [0, 0];
    return [(cx - r.left - off[0]) / scale, (cy - r.top - off[1]) / scale];
  };

  /** Snap a mm point to the nearest pad center within 1.5mm. */
  const snapPad = (mx: number, my: number): [number, number] => {
    let best: [number, number] | null = null;
    let bestD = 1.5;
    for (const f of footprints)
      for (const p of f.pads) {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < bestD) {
          bestD = d;
          best = [p.x, p.y];
        }
      }
    return best ?? [mx, my];
  };

  function onBgPointerDown(e: ReactPointerEvent) {
    const st = usePcbStore.getState();
    const [mx, my] = toMM(e.clientX, e.clientY);
    if (tool === "place" && placingLibId) {
      st.addFootprint(placingLibId, Math.round(mx), Math.round(my));
      return;
    }
    if (tool === "route") {
      st.routeClick(...snapPad(mx, my));
      return;
    }
    if (tool === "select") {
      st.select(null);
      drag.current = { kind: "pan", lx: e.clientX, ly: e.clientY };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
  }

  function onMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "pan") {
      setOff(([ox, oy]) => [ox + (e.clientX - d.lx), oy + (e.clientY - d.ly)]);
      d.lx = e.clientX;
      d.ly = e.clientY;
    } else if (d.kind === "move" && d.id) {
      const [mx, my] = toMM(e.clientX, e.clientY);
      usePcbStore.getState().moveFootprint(d.id, Math.round(mx), Math.round(my));
    }
  }

  function onUp(e: ReactPointerEvent) {
    drag.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  function onFpDown(e: ReactPointerEvent, fp: Footprint) {
    e.stopPropagation();
    const st = usePcbStore.getState();
    if (tool === "delete") return st.removeFootprint(fp.id);
    if (tool === "route") {
      const [mx, my] = toMM(e.clientX, e.clientY);
      return st.routeClick(...snapPad(mx, my));
    }
    st.select(fp.id);
    if (tool === "select") {
      drag.current = { kind: "move", id: fp.id, lx: e.clientX, ly: e.clientY };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
  }

  const X = (mm: number) => off[0] + mm * scale;
  const Y = (mm: number) => off[1] + mm * scale;

  return (
    <svg
      ref={svgRef}
      data-testid="pcb-canvas"
      className="h-full w-full bg-[#06231f]"
      onWheel={(e: WheelEvent) =>
        setScale((s) => Math.min(24, Math.max(3, s * (e.deltaY < 0 ? 1.1 : 0.9))))
      }
      onPointerDown={onBgPointerDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      style={{ cursor: tool === "place" || tool === "route" ? "crosshair" : "default" }}
    >
      {/* board outline */}
      {layerVisible.outline && (
        <rect
          x={X(0)}
          y={Y(0)}
          width={board.width * scale}
          height={board.height * scale}
          fill="rgba(20,80,60,0.35)"
          stroke={LAYER_COLOR.outline}
          strokeWidth={1.5}
          rx={4}
        />
      )}

      {/* traces */}
      {traces.map(
        (t) =>
          layerVisible[t.layer] && (
            <polyline
              key={t.id}
              points={t.points.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}
              fill="none"
              stroke={LAYER_COLOR[t.layer]}
              strokeWidth={Math.max(1, t.width * scale)}
              strokeLinecap="round"
            />
          ),
      )}

      {/* footprints */}
      {footprints.map((f) => {
        const selected = f.id === selectedId;
        return (
          <g
            key={f.id}
            data-testid={`fp-${f.ref}`}
            onPointerDown={(e) => onFpDown(e, f)}
            style={{ cursor: tool === "select" ? "move" : undefined }}
          >
            {f.pads.map((p, i) => (
              <rect
                key={i}
                x={X(p.x) - (p.w * scale) / 2}
                y={Y(p.y) - (p.h * scale) / 2}
                width={p.w * scale}
                height={p.h * scale}
                rx={1}
                fill={p.netId ? "#e0b341" : "#9a8748"}
                stroke={selected ? "var(--accent)" : "none"}
                strokeWidth={1}
              />
            ))}
            <text
              x={X(f.x)}
              y={Y(f.y) - 8}
              textAnchor="middle"
              fontSize={9}
              fill={selected ? "var(--accent)" : LAYER_COLOR.silk}
            >
              {f.ref}
            </text>
          </g>
        );
      })}

      {/* route anchor */}
      {routeFrom && <circle cx={X(routeFrom[0])} cy={Y(routeFrom[1])} r={4} fill="var(--warn)" />}
    </svg>
  );
}
