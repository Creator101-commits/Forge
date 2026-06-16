import { create } from "zustand";
import { getFootprint } from "@/features/pcb/footprints";

/**
 * PCB editor store (M6).
 *
 * Footprints carry resolved pads (world mm coordinates); traces connect pad
 * world-points. `computeDrc` mirrors `pcb_ops::run_drc` (footprint_no_pads,
 * unconnected_pad, invalid_trace) and adds a clearance check between traces and
 * pads of different nets, so the board is design-rule-checked locally.
 */

export type PcbTool = "select" | "place" | "route" | "delete";
export type LayerId = "top" | "bottom" | "silk" | "outline";

export interface Pad {
  name: string;
  /** World position, mm. */
  x: number;
  y: number;
  w: number;
  h: number;
  netId: string | null;
}

export interface Footprint {
  id: string;
  ref: string;
  libId: string;
  x: number;
  y: number;
  rotation: number;
  side: "top" | "bottom";
  pads: Pad[];
}

export interface Trace {
  id: string;
  netId: string;
  layer: LayerId;
  points: [number, number][];
  width: number;
}

export interface DrcIssue {
  severity: "Error" | "Warning";
  code: string;
  message: string;
  position: [number, number] | null;
}

export interface BoardOutline {
  width: number;
  height: number;
}

const EPS = 0.01;
const DEFAULT_CLEARANCE = 0.2; // mm

function rot(dx: number, dy: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)];
}

/** Resolve a footprint's library pads into world coordinates. */
export function resolvePads(libId: string, x: number, y: number, rotation: number): Pad[] {
  const def = getFootprint(libId);
  if (!def) return [];
  return def.pads.map((p) => {
    const [rx, ry] = rot(p.dx, p.dy, rotation);
    return { name: p.name, x: x + rx, y: y + ry, w: p.w, h: p.h, netId: null };
  });
}

function near(ax: number, ay: number, bx: number, by: number): boolean {
  return Math.abs(ax - bx) < EPS && Math.abs(ay - by) < EPS;
}

function distPointSeg(px: number, py: number, a: [number, number], b: [number, number]): number {
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function computeDrc(
  footprints: Footprint[],
  traces: Trace[],
  clearance = DEFAULT_CLEARANCE,
): DrcIssue[] {
  const issues: DrcIssue[] = [];

  for (const fp of footprints) {
    if (fp.pads.length === 0) {
      issues.push({
        severity: "Warning",
        code: "footprint_no_pads",
        message: `Footprint '${fp.ref}' has no pads`,
        position: [fp.x, fp.y],
      });
    }
  }

  const allPads = footprints.flatMap((f) => f.pads.map((p) => ({ ...p, ref: f.ref })));
  for (const pad of allPads) {
    const onTrace = traces.some((t) => t.points.some(([tx, ty]) => near(tx, ty, pad.x, pad.y)));
    if (!pad.netId && !onTrace) {
      issues.push({
        severity: "Warning",
        code: "unconnected_pad",
        message: `Pad '${pad.name}' on '${pad.ref}' has no net assignment`,
        position: [pad.x, pad.y],
      });
    }
  }

  for (const t of traces) {
    if (t.points.length < 2) {
      issues.push({
        severity: "Error",
        code: "invalid_trace",
        message: `Trace '${t.id}' has fewer than 2 points`,
        position: t.points[0] ?? null,
      });
    }
  }

  // Clearance: a pad of a different net too close to a trace segment.
  for (const t of traces) {
    for (let i = 0; i + 1 < t.points.length; i++) {
      const a = t.points[i]!;
      const b = t.points[i + 1]!;
      for (const pad of allPads) {
        if (pad.netId && pad.netId === t.netId) continue;
        const d = distPointSeg(pad.x, pad.y, a, b) - t.width / 2 - Math.max(pad.w, pad.h) / 2;
        if (d < clearance && !near(a[0], a[1], pad.x, pad.y) && !near(b[0], b[1], pad.x, pad.y)) {
          issues.push({
            severity: "Error",
            code: "clearance",
            message: `Trace too close to pad '${pad.name}' on '${pad.ref}' (${clearance}mm rule)`,
            position: [pad.x, pad.y],
          });
        }
      }
    }
  }

  return issues;
}

export interface PcbState {
  footprints: Footprint[];
  traces: Trace[];
  board: BoardOutline;
  tool: PcbTool;
  placingLibId: string | null;
  activeLayer: LayerId;
  layerVisible: Record<LayerId, boolean>;
  selectedId: string | null;
  routeFrom: [number, number] | null;
  drc: DrcIssue[];
  seq: number;

  setTool: (t: PcbTool) => void;
  armPlace: (libId: string) => void;
  addFootprint: (libId: string, x: number, y: number) => Footprint;
  removeFootprint: (id: string) => void;
  moveFootprint: (id: string, x: number, y: number) => void;
  select: (id: string | null) => void;
  setActiveLayer: (l: LayerId) => void;
  toggleLayer: (l: LayerId) => void;
  routeClick: (x: number, y: number) => void;
  cancelRoute: () => void;
  runDrc: () => DrcIssue[];
  reset: () => void;
}

function nextRef(footprints: Footprint[], prefix: string): string {
  let max = 0;
  for (const f of footprints) {
    const m = f.ref.match(new RegExp(`^${prefix}(\\d+)$`));
    if (m && m[1]) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}${max + 1}`;
}

export const usePcbStore = create<PcbState>((set, get) => ({
  footprints: [],
  traces: [],
  board: { width: 50, height: 30 },
  tool: "select",
  placingLibId: null,
  activeLayer: "top",
  layerVisible: { top: true, bottom: true, silk: true, outline: true },
  selectedId: null,
  routeFrom: null,
  drc: [],
  seq: 1,

  setTool: (tool) =>
    set({ tool, placingLibId: tool === "place" ? get().placingLibId : null, routeFrom: null }),
  armPlace: (libId) => set({ tool: "place", placingLibId: libId }),

  addFootprint: (libId, x, y) => {
    const def = getFootprint(libId);
    if (!def) throw new Error(`unknown footprint: ${libId}`);
    const id = `fp${get().seq}`;
    const fp: Footprint = {
      id,
      ref: nextRef(get().footprints, def.refPrefix),
      libId,
      x,
      y,
      rotation: 0,
      side: "top",
      pads: resolvePads(libId, x, y, 0),
    };
    set((s) => ({ footprints: [...s.footprints, fp], selectedId: id, seq: s.seq + 1 }));
    return fp;
  },

  removeFootprint: (id) =>
    set((s) => ({
      footprints: s.footprints.filter((f) => f.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  moveFootprint: (id, x, y) =>
    set((s) => ({
      footprints: s.footprints.map((f) =>
        f.id === id ? { ...f, x, y, pads: resolvePads(f.libId, x, y, f.rotation) } : f,
      ),
    })),

  select: (id) => set({ selectedId: id }),
  setActiveLayer: (activeLayer) => set({ activeLayer }),
  toggleLayer: (l) =>
    set((s) => ({ layerVisible: { ...s.layerVisible, [l]: !s.layerVisible[l] } })),

  routeClick: (x, y) => {
    const from = get().routeFrom;
    if (!from) {
      set({ routeFrom: [x, y] });
      return;
    }
    if (near(from[0], from[1], x, y)) {
      set({ routeFrom: null });
      return;
    }
    const netId = `net${get().seq}`;
    const trace: Trace = {
      id: `t${get().seq}`,
      netId,
      layer: get().activeLayer,
      points: [from, [x, y]],
      width: 0.25,
    };
    // Tag the touched pads with this net so DRC sees them connected.
    set((s) => ({
      traces: [...s.traces, trace],
      footprints: s.footprints.map((f) => ({
        ...f,
        pads: f.pads.map((p) =>
          near(p.x, p.y, from[0], from[1]) || near(p.x, p.y, x, y) ? { ...p, netId } : p,
        ),
      })),
      routeFrom: null,
      seq: s.seq + 1,
    }));
  },

  cancelRoute: () => set({ routeFrom: null }),

  runDrc: () => {
    const drc = computeDrc(get().footprints, get().traces);
    set({ drc });
    return drc;
  },

  reset: () =>
    set({
      footprints: [],
      traces: [],
      tool: "select",
      placingLibId: null,
      selectedId: null,
      routeFrom: null,
      drc: [],
      seq: 1,
    }),
}));
