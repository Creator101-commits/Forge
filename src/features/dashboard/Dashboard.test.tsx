import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Project, RecentProject } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  createProject: vi.fn(),
  openProject: vi.fn(),
  saveProject: vi.fn(),
  closeProject: vi.fn(),
  listRecentProjects: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { Dashboard } from "./Dashboard";
import { useProjectStore } from "@/store/project";
import { useUiStore } from "@/store/ui";

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

const recents: RecentProject[] = [
  {
    path: "/tmp/temp-monitor",
    name: "Temp Monitor",
    opened_at: Math.floor(Date.now() / 1000) - 120,
  },
  { path: "/tmp/blink", name: "Blink", opened_at: Math.floor(Date.now() / 1000) - 7200 },
];

beforeEach(() => {
  useProjectStore.setState({
    current: null,
    recents: [],
    status: "idle",
    error: null,
    dirty: false,
  });
  useUiStore.setState({ activeWorkspace: "dashboard" });
  vi.clearAllMocks();
});

describe("Dashboard", () => {
  it("shows the empty state when there are no recents", async () => {
    vi.mocked(ipc.listRecentProjects).mockResolvedValue([]);
    render(<Dashboard />);
    expect(await screen.findByTestId("recents-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("recents-list")).not.toBeInTheDocument();
  });

  it("renders recent projects and opens one on click", async () => {
    vi.mocked(ipc.listRecentProjects).mockResolvedValue(recents);
    vi.mocked(ipc.openProject).mockResolvedValue(project);
    const user = userEvent.setup();
    render(<Dashboard />);

    const list = await screen.findByTestId("recents-list");
    expect(within(list).getByText("Temp Monitor")).toBeInTheDocument();
    expect(within(list).getByText("Blink")).toBeInTheDocument();

    await user.click(within(list).getByText("Temp Monitor"));
    await waitFor(() => expect(ipc.openProject).toHaveBeenCalledWith("/tmp/temp-monitor"));
  });

  it("creates a project through the New Project form and routes to Code", async () => {
    vi.mocked(ipc.listRecentProjects).mockResolvedValue([]);
    vi.mocked(ipc.createProject).mockResolvedValue(project);
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(screen.getByRole("button", { name: "New Project" }));
    await user.type(screen.getByLabelText("Project name"), "Temp Monitor");
    await user.type(screen.getByLabelText("Location"), "/tmp/temp-monitor");
    await user.click(screen.getByRole("button", { name: "Create Project" }));

    await waitFor(() =>
      expect(ipc.createProject).toHaveBeenCalledWith("/tmp/temp-monitor", "Temp Monitor"),
    );
    expect(useUiStore.getState().activeWorkspace).toBe("code");
  });

  it("lists starter templates", async () => {
    vi.mocked(ipc.listRecentProjects).mockResolvedValue([]);
    render(<Dashboard />);
    expect(await screen.findByText("Temperature Monitor")).toBeInTheDocument();
    expect(screen.getByText("Blank Project")).toBeInTheDocument();
  });
});
