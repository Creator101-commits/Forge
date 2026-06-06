import { create } from "zustand";
import * as ipc from "@/lib/ipc";
import type { Project, RecentProject } from "@/lib/ipc";

export type ProjectStatus = "idle" | "loading" | "ready" | "error";

export interface ProjectState {
  current: Project | null;
  recents: RecentProject[];
  status: ProjectStatus;
  error: string | null;
  /** True when `current` has local edits not yet persisted. */
  dirty: boolean;

  createProject: (path: string, name: string) => Promise<Project>;
  openProject: (path: string) => Promise<Project>;
  saveProject: () => Promise<Project | null>;
  closeProject: () => Promise<void>;
  loadRecents: () => Promise<void>;
  /** Apply a local patch to the open project, marking it dirty. */
  patchCurrent: (patch: Partial<Project>) => void;
}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e)
    return String((e as { message: unknown }).message);
  return String(e);
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  current: null,
  recents: [],
  status: "idle",
  error: null,
  dirty: false,

  createProject: async (path, name) => {
    set({ status: "loading", error: null });
    try {
      const project = await ipc.createProject(path, name);
      set({ current: project, status: "ready", dirty: false });
      await get().loadRecents();
      return project;
    } catch (e) {
      set({ status: "error", error: message(e) });
      throw e;
    }
  },

  openProject: async (path) => {
    set({ status: "loading", error: null });
    try {
      const project = await ipc.openProject(path);
      set({ current: project, status: "ready", dirty: false });
      await get().loadRecents();
      return project;
    } catch (e) {
      set({ status: "error", error: message(e) });
      throw e;
    }
  },

  saveProject: async () => {
    const current = get().current;
    if (!current) return null;
    set({ status: "loading", error: null });
    try {
      const saved = await ipc.saveProject(current);
      set({ current: saved, status: "ready", dirty: false });
      return saved;
    } catch (e) {
      set({ status: "error", error: message(e) });
      throw e;
    }
  },

  closeProject: async () => {
    // Best-effort: always reset local state even if the backend call fails.
    try {
      await ipc.closeProject();
    } catch {
      /* ignore — closing should never block the UI */
    }
    set({ current: null, status: "idle", dirty: false, error: null });
  },

  loadRecents: async () => {
    try {
      const recents = await ipc.listRecentProjects();
      set({ recents });
    } catch (e) {
      set({ error: message(e) });
    }
  },

  patchCurrent: (patch) =>
    set((s) => (s.current ? { current: { ...s.current, ...patch }, dirty: true } : s)),
}));
