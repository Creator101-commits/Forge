import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Project, RecentProject } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  createProject: vi.fn(),
  openProject: vi.fn(),
  saveProject: vi.fn(),
  closeProject: vi.fn(),
  listRecentProjects: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { useProjectStore } from "./project";

const project: Project = {
  id: "p1",
  name: "Demo",
  description: null,
  created_at: 1000,
  updated_at: 1000,
  board_target: null,
  units: "mm",
  tags: [],
  ai_persona: "Engineer",
  schema_version: 1,
};

const recent: RecentProject = { path: "/tmp/demo", name: "Demo", opened_at: 1000 };

beforeEach(() => {
  useProjectStore.setState({
    current: null,
    recents: [],
    status: "idle",
    error: null,
    dirty: false,
  });
  vi.clearAllMocks();
});

describe("project store", () => {
  it("openProject transitions idle -> ready and loads recents", async () => {
    vi.mocked(ipc.openProject).mockResolvedValue(project);
    vi.mocked(ipc.listRecentProjects).mockResolvedValue([recent]);

    expect(useProjectStore.getState().status).toBe("idle");
    await useProjectStore.getState().openProject("/tmp/demo");

    const s = useProjectStore.getState();
    expect(s.status).toBe("ready");
    expect(s.current?.id).toBe("p1");
    expect(s.recents).toEqual([recent]);
    expect(ipc.openProject).toHaveBeenCalledWith("/tmp/demo");
  });

  it("createProject sets the current project and clears dirty", async () => {
    vi.mocked(ipc.createProject).mockResolvedValue(project);
    vi.mocked(ipc.listRecentProjects).mockResolvedValue([recent]);

    await useProjectStore.getState().createProject("/tmp/demo", "Demo");
    expect(useProjectStore.getState().current?.name).toBe("Demo");
    expect(useProjectStore.getState().dirty).toBe(false);
  });

  it("openProject sets error status when IPC rejects", async () => {
    vi.mocked(ipc.openProject).mockRejectedValue({ code: "not_found", message: "missing" });

    await expect(useProjectStore.getState().openProject("/nope")).rejects.toBeTruthy();
    const s = useProjectStore.getState();
    expect(s.status).toBe("error");
    expect(s.error).toContain("missing");
  });

  it("patchCurrent marks dirty and saveProject persists + clears dirty", async () => {
    useProjectStore.setState({ current: project, status: "ready" });
    useProjectStore.getState().patchCurrent({ name: "Renamed" });
    expect(useProjectStore.getState().dirty).toBe(true);
    expect(useProjectStore.getState().current?.name).toBe("Renamed");

    vi.mocked(ipc.saveProject).mockResolvedValue({ ...project, name: "Renamed", updated_at: 2000 });
    await useProjectStore.getState().saveProject();
    expect(useProjectStore.getState().dirty).toBe(false);
    expect(useProjectStore.getState().current?.updated_at).toBe(2000);
  });

  it("closeProject resets to idle even if IPC fails", async () => {
    useProjectStore.setState({ current: project, status: "ready" });
    vi.mocked(ipc.closeProject).mockRejectedValue(new Error("boom"));
    await useProjectStore.getState().closeProject();
    expect(useProjectStore.getState().current).toBeNull();
    expect(useProjectStore.getState().status).toBe("idle");
  });
});
