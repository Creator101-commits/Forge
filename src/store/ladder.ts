import { create } from "zustand";

/**
 * Ladder-logic editor store (M5).
 *
 * Rungs are a left-to-right series of contacts feeding a coil. `evaluateRung`
 * provides a simple simulation: normally-open (NO) contacts pass when their
 * variable is true, normally-closed (NC) when false; a rung's coil energizes on
 * the series-AND of its contacts.
 */

export type ElementKind = "no" | "nc" | "coil" | "timer";

export interface LadderElement {
  id: string;
  kind: ElementKind;
  /** Symbolic variable name, e.g. "Start", "Motor". */
  label: string;
}

export interface Rung {
  id: string;
  elements: LadderElement[];
}

export const ELEMENT_LABELS: Record<ElementKind, string> = {
  no: "NO contact",
  nc: "NC contact",
  coil: "Coil",
  timer: "Timer",
};

/** Evaluate a rung's coil state given a boolean variable map. */
export function evaluateRung(
  elements: LadderElement[],
  state: Record<string, boolean>,
): { energized: boolean; coil: string | null } {
  const contacts = elements.filter((e) => e.kind === "no" || e.kind === "nc");
  const coil = elements.find((e) => e.kind === "coil" || e.kind === "timer") ?? null;
  let energized = true;
  for (const c of contacts) {
    const v = !!state[c.label];
    if (c.kind === "no" ? !v : v) {
      energized = false;
      break;
    }
  }
  // A rung with no contacts is always energized (a coil tied directly to power).
  return { energized, coil: coil?.label ?? null };
}

export interface LadderState {
  rungs: Rung[];
  selected: { rungId: string; elementId: string } | null;
  seq: number;

  addRung: () => Rung;
  removeRung: (id: string) => void;
  addElement: (rungId: string, kind: ElementKind, label?: string) => void;
  removeElement: (rungId: string, elementId: string) => void;
  setLabel: (rungId: string, elementId: string, label: string) => void;
  select: (rungId: string, elementId: string) => void;
  reset: () => void;
}

const DEFAULT_LABEL: Record<ElementKind, string> = {
  no: "X",
  nc: "X",
  coil: "Y",
  timer: "T",
};

export const useLadderStore = create<LadderState>((set, get) => ({
  rungs: [],
  selected: null,
  seq: 1,

  addRung: () => {
    const rung: Rung = { id: `r${get().seq}`, elements: [] };
    set((s) => ({ rungs: [...s.rungs, rung], seq: s.seq + 1 }));
    return rung;
  },

  removeRung: (id) => set((s) => ({ rungs: s.rungs.filter((r) => r.id !== id) })),

  addElement: (rungId, kind, label) =>
    set((s) => ({
      rungs: s.rungs.map((r) =>
        r.id === rungId
          ? {
              ...r,
              elements: [
                ...r.elements,
                {
                  id: `e${get().seq}`,
                  kind,
                  label: label ?? `${DEFAULT_LABEL[kind]}${get().seq}`,
                },
              ],
            }
          : r,
      ),
      seq: s.seq + 1,
    })),

  removeElement: (rungId, elementId) =>
    set((s) => ({
      rungs: s.rungs.map((r) =>
        r.id === rungId ? { ...r, elements: r.elements.filter((e) => e.id !== elementId) } : r,
      ),
    })),

  setLabel: (rungId, elementId, label) =>
    set((s) => ({
      rungs: s.rungs.map((r) =>
        r.id === rungId
          ? { ...r, elements: r.elements.map((e) => (e.id === elementId ? { ...e, label } : e)) }
          : r,
      ),
    })),

  select: (rungId, elementId) => set({ selected: { rungId, elementId } }),

  reset: () => set({ rungs: [], selected: null, seq: 1 }),
}));
