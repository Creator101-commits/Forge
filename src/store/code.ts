import { create } from "zustand";
import * as ipc from "@/lib/ipc";
import { languageForPath } from "@/lib/language";

export interface CodeTab {
  path: string;
  name: string;
  language: string;
  content: string;
  /** Last persisted content, for dirty detection. */
  savedContent: string;
}

/** A request to move the editor caret to a location, consumed once by the view. */
export interface RevealRequest {
  path: string;
  line: number;
  column: number;
}

export interface CodeState {
  tabs: CodeTab[];
  activePath: string | null;
  pendingReveal: RevealRequest | null;
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
  saveActive: () => Promise<void>;
  /** Open `path` (if needed) and request the editor reveal a 1-based location. */
  openAt: (path: string, line: number, column: number) => Promise<void>;
  consumeReveal: () => void;
  /** Reflect an external (watcher-driven) removal/rename by dropping the tab. */
  dropPath: (path: string) => void;
}

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function isDirty(tab: CodeTab): boolean {
  return tab.content !== tab.savedContent;
}

export const useCodeStore = create<CodeState>((set, get) => ({
  tabs: [],
  activePath: null,
  pendingReveal: null,

  openFile: async (path) => {
    const existing = get().tabs.find((t) => t.path === path);
    if (existing) {
      set({ activePath: path });
      return;
    }
    const content = await ipc.readFile(path);
    const tab: CodeTab = {
      path,
      name: basename(path),
      language: languageForPath(path),
      content,
      savedContent: content,
    };
    set((s) => ({ tabs: [...s.tabs, tab], activePath: path }));
  },

  closeTab: (path) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.path === path);
      if (idx === -1) return s;
      const tabs = s.tabs.filter((t) => t.path !== path);
      let activePath = s.activePath;
      if (s.activePath === path) {
        const neighbor = tabs[idx] ?? tabs[idx - 1] ?? null;
        activePath = neighbor ? neighbor.path : null;
      }
      return { tabs, activePath };
    }),

  setActive: (path) => set({ activePath: path }),

  updateContent: (path, content) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.path === path ? { ...t, content } : t)),
    })),

  saveFile: async (path) => {
    const tab = get().tabs.find((t) => t.path === path);
    if (!tab) return;
    await ipc.writeFile(path, tab.content);
    set((s) => ({
      tabs: s.tabs.map((t) => (t.path === path ? { ...t, savedContent: t.content } : t)),
    }));
  },

  saveActive: async () => {
    const active = get().activePath;
    if (active) await get().saveFile(active);
  },

  openAt: async (path, line, column) => {
    await get().openFile(path);
    set({ pendingReveal: { path, line, column } });
  },

  consumeReveal: () => set({ pendingReveal: null }),

  dropPath: (path) => get().closeTab(path),
}));
