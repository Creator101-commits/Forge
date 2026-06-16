import { create } from "zustand";

const STORAGE_KEY = "forge:event_log:orphaned";

export interface EventLogState {
  hasOrphanedLog: boolean;
  recovered: boolean;
  checkOrphanedLog: () => void;
  markRecovered: () => void;
  clearOrphanedLog: () => void;
}

export const useEventLogStore = create<EventLogState>((set) => ({
  hasOrphanedLog: false,
  recovered: false,

  checkOrphanedLog: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      set({ hasOrphanedLog: stored === "true" });
    } catch {
      set({ hasOrphanedLog: false });
    }
  },

  markRecovered: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    set({ hasOrphanedLog: false, recovered: true });
  },

  clearOrphanedLog: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    set({ hasOrphanedLog: false, recovered: false });
  },
}));
