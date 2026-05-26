import { create } from "zustand";
import type { WorkspaceId } from "@/app/workspaces";

export interface UiState {
  activeWorkspace: WorkspaceId;
  leftSidebarOpen: boolean;
  rightInspectorOpen: boolean;
  bottomDockOpen: boolean;
  setActiveWorkspace: (id: WorkspaceId) => void;
  toggleLeftSidebar: () => void;
  toggleRightInspector: () => void;
  toggleBottomDock: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeWorkspace: "dashboard",
  leftSidebarOpen: true,
  rightInspectorOpen: true,
  bottomDockOpen: true,
  setActiveWorkspace: (id) => set({ activeWorkspace: id }),
  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  toggleRightInspector: () => set((s) => ({ rightInspectorOpen: !s.rightInspectorOpen })),
  toggleBottomDock: () => set((s) => ({ bottomDockOpen: !s.bottomDockOpen })),
}));
