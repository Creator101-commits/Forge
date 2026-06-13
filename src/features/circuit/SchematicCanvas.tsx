import { useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { clsx } from "clsx";
import {
  useCircuitStore,
  worldPins,
  GRID,
  type SchematicComponent,
} from "@/store/circuit";
import { getSymbol } from "./symbols";

interface View {
  x: number;
  y: number;
  scale: number;
}

/** Interactive SVG schematic canvas: pan/zoom, place, select/move, wire, delete. */
export function SchematicCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{ kind: "pan" | "move"; id?: string; lastX: number; lastY: number } | null>(
    null,
  );

  const tool = useCircuitStore((s) => s.tool);
  const placingSymbolId = useCircuitStore((s) => s.placingSymbolId);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const selectedId = useCircuitStore((s) => s.selectedId);
  const wireStart = useCircuitStore((s) => s.wireStart);

  function toWorld(clientX: number, clientY: number): [number, number] {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return [0, 0];
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return [sx / view.scale - view.x, sy / view.scale - view.y];
  }

  function onWheel(e: WheelEvent) {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setView((v) => ({ ...v, scale: Math.min(4, Math.max(0.25, v.scale * factor)) }));
  }

  function onBackgroundPointerDown(e: ReactPointerEvent) {
    const st = useCircuitStore.getState();
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    if (tool === "place" && placingSymbolId) {
      st.addComponent(placingSymbolId, wx, wy);
      return;
    }
    if (tool === "wire") return; // wiring uses pin handles
    if (tool === "select") {
      st.select(null);
      dragRef.current = { kind: "pan", lastX: e.clientX, lastY: e.clientY };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.lastX) / view.scale;
    const dy = (e.clientY - d.lastY) / view.scale;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    if (d.kind === "pan") {
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    } else if (d.kind === "move" && d.id) {
      const st = useCircuitStore.getState();
      const c = st.components.find((cc) => cc.id === d.id);
      if (c) st.moveComponent(c.id, c.x + dx, c.y + dy);
    }
  }

  function onPointerUp(e: ReactPointerEvent) {
    dragRef.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  function onComponentPointerDown(e: ReactPointerEvent, comp: SchematicComponent) {
    e.stopPropagation();
    const st = useCircuitStore.getState();
    if (tool === "delete") {
      st.removeComponent(comp.id);
      return;
    }
    st.select(comp.id);
    if (tool === "select") {
      dragRef.current = { kind: "move", id: comp.id, lastX: e.clientX, lastY: e.clientY };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    }
  }

  function onPinClick(e: ReactPointerEvent, x: number, y: number) {
    if (tool !== "wire") return;
    e.stopPropagation();
    const st = useCircuitStore.getState();
    if (!st.wireStart) st.beginWire(x, y);
    else st.commitWire(x, y);
  }

  const pins = worldPins(components);

  return (
    <svg
      ref={svgRef}
      data-testid="schematic-canvas"
      className={clsx(
        "h-full w-full bg-bg-1 text-text-2",
        tool === "place" && "cursor-crosshair",
        tool === "wire" && "cursor-cell",
        tool === "delete" && "cursor-not-allowed",
      )}
      onWheel={onWheel}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <defs>
        <pattern
          id="sch-grid"
          width={GRID * view.scale}
          height={GRID * view.scale}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${view.x * view.scale}, ${view.y * view.scale})`}
        >
          <circle cx={0.5} cy={0.5} r={0.5} fill="currentColor" className="text-border-2" />
        </pattern>
      </defs>
      <rect x={0} y={0} width="100%" height="100%" fill="url(#sch-grid)" className="opacity-40" />

      <g transform={`translate(${view.x * view.scale}, ${view.y * view.scale}) scale(${view.scale})`}>
        {/* Wires */}
        {wires.map((w) => (
          <polyline
            key={w.id}
            points={w.points.map((p) => p.join(",")).join(" ")}
            fill="none"
            className="text-accent"
            stroke="currentColor"
            strokeWidth={2}
          />
        ))}

        {/* Components */}
        {components.map((c) => {
          const sym = getSymbol(c.symbolId);
          if (!sym) return null;
          const selected = c.id === selectedId;
          return (
            <g
              key={c.id}
              data-testid={`sch-comp-${c.refDes}`}
              transform={`translate(${c.x},${c.y}) rotate(${c.rotation}) scale(${c.mirrored ? -1 : 1},1)`}
              className={clsx(selected ? "text-accent" : "text-text-1")}
              onPointerDown={(e) => onComponentPointerDown(e, c)}
              style={{ cursor: tool === "select" ? "move" : undefined }}
            >
              {selected && (
                <rect
                  x={-36}
                  y={-36}
                  width={72}
                  height={72}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={0.5}
                  strokeDasharray="3 3"
                  className="opacity-60"
                />
              )}
              {sym.body}
              {/* refDes + value labels (counter-rotate so text stays upright) */}
              <text
                transform={`scale(${c.mirrored ? -1 : 1},1) rotate(${-c.rotation})`}
                x={0}
                y={-26}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                className="select-none"
              >
                {c.refDes}
              </text>
              <text
                transform={`scale(${c.mirrored ? -1 : 1},1) rotate(${-c.rotation})`}
                x={0}
                y={40}
                textAnchor="middle"
                fontSize={8}
                className="select-none fill-text-3"
              >
                {c.value}
              </text>
            </g>
          );
        })}

        {/* Pin handles (visible/clickable in wire mode) */}
        {pins.map((p, i) => {
          const active =
            tool === "wire" &&
            wireStart != null &&
            wireStart[0] === p.x &&
            wireStart[1] === p.y;
          return (
            <circle
              key={`${p.componentId}-${p.number}-${i}`}
              data-testid="sch-pin"
              cx={p.x}
              cy={p.y}
              r={tool === "wire" ? 3 : 1.5}
              className={clsx(
                active ? "fill-warn" : tool === "wire" ? "fill-accent" : "fill-text-3",
              )}
              style={{ cursor: tool === "wire" ? "pointer" : "default" }}
              onPointerDown={(e) => onPinClick(e, p.x, p.y)}
            />
          );
        })}
      </g>
    </svg>
  );
}
