import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/ipc", () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  listRecentProjects: vi.fn().mockResolvedValue([]),
  createProject: vi.fn(),
  openProject: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { Router } from "./Router";
import { useUiStore } from "@/store/ui";
import { useSettingsStore } from "@/store/settings";

function Harness() {
  const active = useUiStore((s) => s.activeWorkspace);
  return <Router workspace={active} />;
}

beforeEach(() => {
  useUiStore.setState({ activeWorkspace: "dashboard" });
  useSettingsStore.setState({
    settings: {
      theme: "dark",
      density: "comfortable",
      reduced_motion: false,
      telemetry_enabled: false,
      default_ai_provider: null,
    },
    loaded: true,
  });
  vi.clearAllMocks();
  vi.mocked(ipc.setSettings).mockImplementation(async (s) => s);
  vi.mocked(ipc.getSettings).mockResolvedValue({
    theme: "dark",
    density: "comfortable",
    reduced_motion: false,
    telemetry_enabled: false,
    default_ai_provider: null,
  });
});

describe("Router", () => {
  it("renders the registered component for the active workspace", () => {
    useUiStore.setState({ activeWorkspace: "settings" });
    render(<Harness />);
    expect(screen.getByTestId("workspace-settings")).toBeInTheDocument();
  });

  it("falls back to the placeholder for unimplemented workspaces", () => {
    useUiStore.setState({ activeWorkspace: "cad" });
    render(<Harness />);
    expect(screen.getByTestId("workspace-cad")).toBeInTheDocument();
  });

  it("preserves workspace state across CAD <-> Code <-> Settings switches", async () => {
    const user = userEvent.setup();
    useUiStore.setState({ activeWorkspace: "settings" });
    render(<Harness />);

    // Change a Settings value (lives in the settings store).
    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(useSettingsStore.getState().settings.theme).toBe("light");

    // Navigate away to Code, then CAD — Settings unmounts.
    act(() => useUiStore.getState().setActiveWorkspace("code"));
    expect(screen.getByTestId("workspace-code")).toBeInTheDocument();
    expect(screen.queryByTestId("workspace-settings")).not.toBeInTheDocument();

    act(() => useUiStore.getState().setActiveWorkspace("cad"));
    expect(screen.getByTestId("workspace-cad")).toBeInTheDocument();

    // Back to Settings: the previously chosen theme survived the remount.
    act(() => useUiStore.getState().setActiveWorkspace("settings"));
    expect(useSettingsStore.getState().settings.theme).toBe("light");
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
  });
});
