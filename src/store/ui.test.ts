import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore } from "./ui";

describe("ui store", () => {
  beforeEach(() => {
    useUiStore.setState({
      activeWorkspace: "dashboard",
      leftSidebarOpen: true,
      rightInspectorOpen: true,
      bottomDockOpen: true,
    });
  });

  it("changes active workspace", () => {
    useUiStore.getState().setActiveWorkspace("pcb");
    expect(useUiStore.getState().activeWorkspace).toBe("pcb");
  });

  it("toggles panels", () => {
    useUiStore.getState().toggleLeftSidebar();
    useUiStore.getState().toggleRightInspector();
    useUiStore.getState().toggleBottomDock();
    const s = useUiStore.getState();
    expect(s.leftSidebarOpen).toBe(false);
    expect(s.rightInspectorOpen).toBe(false);
    expect(s.bottomDockOpen).toBe(false);
  });
});
