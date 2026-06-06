import { create } from "zustand";
import * as ipc from "@/lib/ipc";
import type { Diagnostic } from "@/lib/ipc";

export interface DiagnosticsState {
  items: Diagnostic[];
  setItems: (items: Diagnostic[]) => void;
  push: (d: Diagnostic) => void;
  clear: () => void;
  load: () => Promise<void>;
  subscribe: () => Promise<() => void>;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  push: (d) => set((s) => ({ items: [...s.items, d] })),
  clear: () => set({ items: [] }),

  load: async () => {
    try {
      const items = await ipc.listDiagnostics();
      set({ items });
    } catch {
      /* no backend (browser) — keep current */
    }
  },

  subscribe: async () => {
    return ipc.onEvent<Diagnostic[]>("diag://changed", (items) => set({ items }));
  },
}));
