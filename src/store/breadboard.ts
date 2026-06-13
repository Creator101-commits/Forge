import { create } from "zustand";

/**
 * Breadboard editor store (M5).
 *
 * Models a half-size solderless breadboard as a set of addressable holes plus
 * user-placed jumper wires. Tie-point electrical rules are encoded in each
 * hole's `node` id (a column half shares a node; each power rail shares a node);
 * jumpers union nodes. `computeNets` resolves the connected groups so the
 * breadboard is electrically aware and testable.
 */

export const COLS = 30;
export const JUMPER_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#e6edf3"];

export interface Hole {
  id: string;
  /** Electrical node before jumpers are applied. */
  node: string;
  x: number;
  y: number;
}

export interface Jumper {
  id: string;
  from: string; // hole id
  to: string; // hole id
  color: string;
}

const HOLE = 16; // px spacing
const ORIGIN_X = 30;
const ORIGIN_Y = 30;

/** Build the static hole grid: two power rails, then main top/bottom halves. */
export function buildHoles(): Hole[] {
  const holes: Hole[] = [];
  const push = (id: string, node: string, x: number, y: number) =>
    holes.push({ id, node, x, y });

  let y = ORIGIN_Y;
  // Top rails: + and -
  for (let c = 0; c < COLS; c++) push(`rt+:${c}`, "RT+", ORIGIN_X + c * HOLE, y);
  y += HOLE;
  for (let c = 0; c < COLS; c++) push(`rt-:${c}`, "RT-", ORIGIN_X + c * HOLE, y);

  // Main top half (rows a-e share a column node)
  y += HOLE * 1.5;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < COLS; c++) push(`t:${c}:${r}`, `T${c}`, ORIGIN_X + c * HOLE, y);
    y += HOLE;
  }

  // Main bottom half (rows f-j share a column node)
  y += HOLE * 0.5;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < COLS; c++) push(`b:${c}:${r}`, `B${c}`, ORIGIN_X + c * HOLE, y);
    y += HOLE;
  }

  // Bottom rails
  y += HOLE * 0.5;
  for (let c = 0; c < COLS; c++) push(`rb+:${c}`, "RB+", ORIGIN_X + c * HOLE, y);
  y += HOLE;
  for (let c = 0; c < COLS; c++) push(`rb-:${c}`, "RB-", ORIGIN_X + c * HOLE, y);

  return holes;
}

/** Union-find resolution of tie-point nodes + jumpers into connected nets. */
export function computeNets(holes: Hole[], jumpers: Jumper[]): Map<string, number> {
  const parent = new Map<string, string>();
  const find = (a: string): string => {
    let r = a;
    while (parent.get(r) && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(a, r);
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const h of holes) {
    if (!parent.has(h.node)) parent.set(h.node, h.node);
  }
  const byId = new Map(holes.map((h) => [h.id, h]));
  for (const j of jumpers) {
    const a = byId.get(j.from);
    const b = byId.get(j.to);
    if (a && b) union(a.node, b.node);
  }

  // Assign a stable net index per root.
  const rootIndex = new Map<string, number>();
  const result = new Map<string, number>();
  let next = 0;
  for (const h of holes) {
    const root = find(h.node);
    if (!rootIndex.has(root)) rootIndex.set(root, next++);
    result.set(h.node, rootIndex.get(root)!);
  }
  return result;
}

export interface BreadboardState {
  holes: Hole[];
  jumpers: Jumper[];
  pendingFrom: string | null;
  color: string;
  selectedJumper: string | null;
  seq: number;

  setColor: (c: string) => void;
  holeClick: (holeId: string) => void;
  removeJumper: (id: string) => void;
  selectJumper: (id: string | null) => void;
  reset: () => void;
}

export const useBreadboardStore = create<BreadboardState>((set, get) => ({
  holes: buildHoles(),
  jumpers: [],
  pendingFrom: null,
  color: JUMPER_COLORS[0]!,
  selectedJumper: null,
  seq: 1,

  setColor: (color) => set({ color }),

  holeClick: (holeId) => {
    const { pendingFrom } = get();
    if (!pendingFrom) {
      set({ pendingFrom: holeId });
      return;
    }
    if (pendingFrom === holeId) {
      set({ pendingFrom: null });
      return;
    }
    const jumper: Jumper = {
      id: `j${get().seq}`,
      from: pendingFrom,
      to: holeId,
      color: get().color,
    };
    set((s) => ({ jumpers: [...s.jumpers, jumper], pendingFrom: null, seq: s.seq + 1 }));
  },

  removeJumper: (id) =>
    set((s) => ({
      jumpers: s.jumpers.filter((j) => j.id !== id),
      selectedJumper: s.selectedJumper === id ? null : s.selectedJumper,
    })),

  selectJumper: (id) => set({ selectedJumper: id }),

  reset: () =>
    set({ jumpers: [], pendingFrom: null, selectedJumper: null, color: JUMPER_COLORS[0]!, seq: 1 }),
}));
