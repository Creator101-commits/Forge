import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
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
      default_board: null,
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
    default_board: null,
  });
});

async function waitForWorkspace(testId: string) {
  await waitFor(() => expect(screen.getByTestId(testId)).toBeInTheDocument());
}

describe("Router", () => {
  it("renders the registered component for the active workspace", async () => {
    useUiStore.setState({ activeWorkspace: "settings" });
    render(<Harness />);
    await waitForWorkspace("workspace-settings");
  });

  it("falls back to the placeholder for unimplemented workspaces", async () => {
    useUiStore.setState({ activeWorkspace: "cad" });
    render(<Harness />);
    await waitForWorkspace("workspace-cad");
  });

  it("preserves workspace state across CAD <-> Code <-> Settings switches", async () => {
    const user = userEvent.setup();
    useUiStore.setState({ activeWorkspace: "settings" });
    render(<Harness />);
    await waitForWorkspace("workspace-settings");

    // Change a Settings value (lives in the settings store).
    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(useSettingsStore.getState().settings.theme).toBe("light");

    // Navigate away to Code, then CAD — Settings unmounts.
    act(() => useUiStore.getState().setActiveWorkspace("code"));
    await waitForWorkspace("workspace-code");
    expect(screen.queryByTestId("workspace-settings")).not.toBeInTheDocument();

    act(() => useUiStore.getState().setActiveWorkspace("cad"));
    await waitForWorkspace("workspace-cad");

    // Back to Settings: the previously chosen theme survived the remount.
    act(() => useUiStore.getState().setActiveWorkspace("settings"));
    await waitForWorkspace("workspace-settings");
    expect(useSettingsStore.getState().settings.theme).toBe("light");
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
  });
});
