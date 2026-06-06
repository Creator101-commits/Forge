import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Project, RecentProject } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  createProject: vi.fn(),
  openProject: vi.fn(),
  saveProject: vi.fn(),
  closeProject: vi.fn(),
  listRecentProjects: vi.fn().mockResolvedValue([]),
  getSettings: vi.fn().mockResolvedValue({
    theme: "dark",
    density: "comfortable",
    reduced_motion: false,
    telemetry_enabled: false,
    default_ai_provider: null,
    default_board: null,
  }),
  setSettings: vi.fn(),
  onEvent: vi.fn().mockResolvedValue(() => {}),
  listDiagnostics: vi.fn().mockResolvedValue([]),
  listSerialPorts: vi.fn().mockResolvedValue([]),
}));

import * as ipc from "@/lib/ipc";
import { AppShell } from "./AppShell";
import { CommandPalette } from "./CommandPalette";
import { useUiStore } from "@/store/ui";
import { useProjectStore } from "@/store/project";

const project: Project = {
  id: "p1",
  name: "Temp Monitor",
  description: null,
  created_at: 1000,
  updated_at: 1000,
  board_target: null,
  units: "mm",
  tags: [],
  ai_persona: "Engineer",
  schema_version: 1,
};

const recent: RecentProject = { path: "/tmp/temp-monitor", name: "Temp Monitor", opened_at: 1000 };

function setPlatform(platform: string) {
  Object.defineProperty(navigator, "platform", { value: platform, configurable: true });
}

beforeEach(() => {
  useUiStore.setState({ activeWorkspace: "dashboard", paletteOpen: false });
  useProjectStore.setState({
    current: null,
    recents: [],
    status: "idle",
    error: null,
    dirty: false,
  });
  vi.clearAllMocks();
  vi.mocked(ipc.listRecentProjects).mockResolvedValue([]);
});

describe("CommandPalette", () => {
  it("opens on the command-palette hotkey (Cmd/Ctrl+K)", async () => {
    setPlatform("MacIntel");
    const user = userEvent.setup();
    render(<AppShell />);

    expect(screen.queryByLabelText("Command palette input")).not.toBeInTheDocument();
    await user.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByLabelText("Command palette input")).toBeInTheDocument();
  });

  it("runs the openProject IPC when a recent-project command is selected", async () => {
    vi.mocked(ipc.openProject).mockResolvedValue(project);
    useProjectStore.setState({ recents: [recent] });
    useUiStore.setState({ paletteOpen: true });

    const user = userEvent.setup();
    render(<CommandPalette />);

    const input = await screen.findByLabelText("Command palette input");
    await user.type(input, "Temp Monitor");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(ipc.openProject).toHaveBeenCalledWith("/tmp/temp-monitor"));
    expect(useUiStore.getState().paletteOpen).toBe(false);
  });

  it("navigates to a workspace from a navigation command", async () => {
    useUiStore.setState({ paletteOpen: true });
    const user = userEvent.setup();
    render(<CommandPalette />);

    const input = await screen.findByLabelText("Command palette input");
    await user.type(input, "Go to Settings");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(useUiStore.getState().activeWorkspace).toBe("settings"));
  });
});
