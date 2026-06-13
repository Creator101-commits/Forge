import { create } from "zustand";
import { getSymbol, type ElectricalType } from "@/features/circuit/symbols";

/**
 * Schematic editor store (M4).
 *
 * The frontend is the local source of truth for the schematic graph; ERC is
 * computed client-side mirroring `circuit_ops::run_erc` so the editor is fully
 * functional and testable without the Rust backend. When the Tauri backend is
 * present these mutations can be mirrored through `circuit_*` IPC commands.
 */

export type CircuitMode = "schematic" | "breadboard" | "block" | "ladder";
export type Tool = "select" | "place" | "wire" | "delete";

export interface SchematicComponent {
  id: string;
  refDes: string;
  symbolId: string;
  value: string;
  /** Center position in world px (grid-snapped). */
  x: number;
  y: number;
  /** Degrees: 0 | 90 | 180 | 270. */
  rotation: number;
  mirrored: boolean;
}

export interface Wire {
  id: string;
  netId: string;
  /** Polyline points in world px. */
  points: [number, number][];
}

export interface Net {
  id: string;
  name: string;
  class: "signal" | "power" | "ground";
}

export interface ErcIssue {
  severity: "Error" | "Warning";
  code: string;
  message: string;
  componentIds: string[];
}

/** A pin resolved into world coordinates. */
export interface WorldPin {
  componentId: string;
  refDes: string;
  name: string;
  number: string;
  x: number;
  y: number;
  electricalType: ElectricalType;
}

export const GRID = 10;

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

/** Apply a component's transform (mirror → rotate → translate) to a local point. */
export function applyTransform(
  px: number,
  py: number,
  c: Pick<SchematicComponent, "x" | "y" | "rotation" | "mirrored">,
): [number, number] {
  const mx = c.mirrored ? -1 : 1;
  const lx = px * mx;
  const ly = py;
  const r = (c.rotation * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const rx = lx * cos - ly * sin;
  const ry = lx * sin + ly * cos;
  return [c.x + rx, c.y + ry];
}

/** Resolve every component's pins into world coordinates. */
export function worldPins(components: SchematicComponent[]): WorldPin[] {
  const out: WorldPin[] = [];
  for (const c of components) {
    const sym = getSymbol(c.symbolId);
    if (!sym) continue;
    for (const p of sym.pins) {
      const [x, y] = applyTransform(p.x, p.y, c);
      out.push({
        componentId: c.id,
        refDes: c.refDes,
        name: p.name,
        number: p.number,
        x,
        y,
        electricalType: p.electricalType,
      });
    }
  }
  return out;
}

const EPS = 0.001;

function wireTouches(w: Wire, x: number, y: number): boolean {
  return w.points.some(([px, py]) => Math.abs(px - x) < EPS && Math.abs(py - y) < EPS);
}

/**
 * Client mirror of `circuit_ops::run_erc`: floating pins (non-power pins not on
 * any wire endpoint), duplicate reference designators, and missing power/ground
 * nets.
 */
export function computeErc(
  components: SchematicComponent[],
  wires: Wire[],
  nets: Net[],
): ErcIssue[] {
  const issues: ErcIssue[] = [];
  const pins = worldPins(components);

  for (const pin of pins) {
    if (pin.electricalType === "power") continue;
    const connected = wires.some((w) => wireTouches(w, pin.x, pin.y));
    if (!connected) {
      issues.push({
        severity: "Warning",
        code: "floating_pin",
        message: `Pin ${pin.name} (${pin.number}) of ${pin.refDes} appears unconnected`,
        componentIds: [pin.componentId],
      });
    }
  }

  for (let i = 0; i < components.length; i++) {
    const a = components[i];
    if (!a) continue;
    for (let j = i + 1; j < components.length; j++) {
      const b = components[j];
      if (b && a.refDes && a.refDes === b.refDes) {
        issues.push({
          severity: "Error",
          code: "duplicate_ref",
          message: `Duplicate reference designator: ${a.refDes}`,
          componentIds: [a.id, b.id],
        });
      }
    }
  }

  const lower = nets.map((n) => n.name.toLowerCase());
  const hasGnd = lower.some((n) => n.includes("gnd") || n.includes("ground"));
  const hasVcc = lower.some(
    (n) => n.includes("vcc") || n.includes("vdd") || n.includes("3v3") || n.includes("5v"),
  );
  if (!hasGnd) {
    issues.push({
      severity: "Warning",
      code: "missing_gnd",
      message: "No ground (GND) net found in the circuit",
      componentIds: [],
    });
  }
  if (!hasVcc) {
    issues.push({
      severity: "Warning",
      code: "missing_power",
      message: "No power (VCC/VDD) net found in the circuit",
      componentIds: [],
    });
  }
  return issues;
}

export interface CircuitState {
  mode: CircuitMode;
  tool: Tool;
  /** Symbol id armed for placement (tool === "place"). */
  placingSymbolId: string | null;
  components: SchematicComponent[];
  wires: Wire[];
  nets: Net[];
  selectedId: string | null;
  erc: ErcIssue[];
  /** First pin endpoint chosen while drawing a wire, if any. */
  wireStart: [number, number] | null;
  seq: number;

  setMode: (mode: CircuitMode) => void;
  setTool: (tool: Tool) => void;
  armPlace: (symbolId: string) => void;
  addComponent: (symbolId: string, x: number, y: number) => SchematicComponent;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  rotateComponent: (id: string) => void;
  mirrorComponent: (id: string) => void;
  setValue: (id: string, value: string) => void;
  select: (id: string | null) => void;
  beginWire: (x: number, y: number) => void;
  commitWire: (x: number, y: number, netName?: string) => Wire | null;
  cancelWire: () => void;
  runErc: () => ErcIssue[];
  reset: () => void;
}

function nextRefDes(components: SchematicComponent[], prefix: string): string {
  let max = 0;
  for (const c of components) {
    const m = c.refDes.match(new RegExp(`^${prefix}(\\d+)$`));
    if (m && m[1]) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}${max + 1}`;
}

/** Orthogonal two-segment route between two points (horizontal then vertical). */
function orthoRoute(a: [number, number], b: [number, number]): [number, number][] {
  if (a[0] === b[0] || a[1] === b[1]) return [a, b];
  return [a, [b[0], a[1]], b];
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
  mode: "schematic",
  tool: "select",
  placingSymbolId: null,
  components: [],
  wires: [],
  nets: [],
  selectedId: null,
  erc: [],
  wireStart: null,
  seq: 1,

  setMode: (mode) => set({ mode }),
  setTool: (tool) =>
    set({ tool, placingSymbolId: tool === "place" ? get().placingSymbolId : null, wireStart: null }),
  armPlace: (symbolId) => set({ tool: "place", placingSymbolId: symbolId }),

  addComponent: (symbolId, x, y) => {
    const sym = getSymbol(symbolId);
    if (!sym) throw new Error(`unknown symbol: ${symbolId}`);
    const id = `c${get().seq}`;
    const comp: SchematicComponent = {
      id,
      refDes: nextRefDes(get().components, sym.refPrefix),
      symbolId,
      value: sym.defaultValue,
      x: snap(x),
      y: snap(y),
      rotation: 0,
      mirrored: false,
    };
    set((s) => ({ components: [...s.components, comp], selectedId: id, seq: s.seq + 1 }));
    return comp;
  },

  removeComponent: (id) =>
    set((s) => {
      const comp = s.components.find((c) => c.id === id);
      if (!comp) return s;
      const pins = worldPins([comp]);
      const wires = s.wires.filter(
        (w) => !pins.some((p) => wireTouches(w, p.x, p.y)),
      );
      return {
        components: s.components.filter((c) => c.id !== id),
        wires,
        selectedId: s.selectedId === id ? null : s.selectedId,
      };
    }),

  moveComponent: (id, x, y) =>
    set((s) => ({
      components: s.components.map((c) => (c.id === id ? { ...c, x: snap(x), y: snap(y) } : c)),
    })),

  rotateComponent: (id) =>
    set((s) => ({
      components: s.components.map((c) =>
        c.id === id ? { ...c, rotation: (c.rotation + 90) % 360 } : c,
      ),
    })),

  mirrorComponent: (id) =>
    set((s) => ({
      components: s.components.map((c) => (c.id === id ? { ...c, mirrored: !c.mirrored } : c)),
    })),

  setValue: (id, value) =>
    set((s) => ({ components: s.components.map((c) => (c.id === id ? { ...c, value } : c)) })),

  select: (id) => set({ selectedId: id }),

  beginWire: (x, y) => set({ wireStart: [snap(x), snap(y)], tool: "wire" }),

  commitWire: (x, y, netName) => {
    const start = get().wireStart;
    if (!start) return null;
    const end: [number, number] = [snap(x), snap(y)];
    if (end[0] === start[0] && end[1] === start[1]) {
      set({ wireStart: null });
      return null;
    }
    const points = orthoRoute(start, end);

    // Reuse a net if either endpoint already touches an existing wire.
    const existing = get().wires.find(
      (w) => wireTouches(w, start[0], start[1]) || wireTouches(w, end[0], end[1]),
    );
    let netId: string;
    let nets = get().nets;
    if (existing) {
      netId = existing.netId;
    } else {
      netId = `n${get().seq}`;
      const cls: Net["class"] = netName
        ? /gnd|ground/i.test(netName)
          ? "ground"
          : /vcc|vdd|3v3|5v|power/i.test(netName)
            ? "power"
            : "signal"
        : "signal";
      nets = [...nets, { id: netId, name: netName ?? netId.toUpperCase(), class: cls }];
    }
    const wire: Wire = { id: `w${get().seq}`, netId, points };
    set((s) => ({ wires: [...s.wires, wire], nets, wireStart: null, seq: s.seq + 1 }));
    return wire;
  },

  cancelWire: () => set({ wireStart: null }),

  runErc: () => {
    const { components, wires, nets } = get();
    const erc = computeErc(components, wires, nets);
    set({ erc });
    return erc;
  },

  reset: () =>
    set({
      components: [],
      wires: [],
      nets: [],
      selectedId: null,
      erc: [],
      wireStart: null,
      tool: "select",
      placingSymbolId: null,
      seq: 1,
    }),
}));
