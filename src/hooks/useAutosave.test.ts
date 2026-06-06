import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import type { Project } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  appendEventLog: vi.fn().mockResolvedValue(1),
}));

import * as ipc from "@/lib/ipc";
import { useAutosave, AUTOSAVE_INTERVAL_MS } from "./useAutosave";
import { useProjectStore } from "@/store/project";

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

beforeEach(() => {
  vi.useFakeTimers();
  useProjectStore.setState({
    current: null,
    recents: [],
    status: "idle",
    error: null,
    dirty: false,
  });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutosave", () => {
  it("does nothing when no project is open", () => {
    renderHook(() => useAutosave());
    act(() => {
      vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS * 3);
    });
    expect(ipc.appendEventLog).not.toHaveBeenCalled();
  });

  it("accumulates one event_log snapshot per interval tick", () => {
    useProjectStore.setState({ current: project });
    renderHook(() => useAutosave());

    act(() => vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS));
    act(() => vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS));
    act(() => vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS));

    expect(ipc.appendEventLog).toHaveBeenCalledTimes(3);
    expect(ipc.appendEventLog).toHaveBeenLastCalledWith("autosave", {
      reason: "interval",
      project,
    });
  });

  it("snapshots on window blur", () => {
    useProjectStore.setState({ current: project });
    renderHook(() => useAutosave());

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(ipc.appendEventLog).toHaveBeenCalledWith("autosave", { reason: "blur", project });
  });

  it("stops autosaving after the project closes", () => {
    useProjectStore.setState({ current: project });
    const { rerender } = renderHook(() => useAutosave());

    act(() => vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS));
    expect(ipc.appendEventLog).toHaveBeenCalledTimes(1);

    act(() => {
      useProjectStore.setState({ current: null });
    });
    rerender();

    act(() => vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS * 2));
    expect(ipc.appendEventLog).toHaveBeenCalledTimes(1);
  });
});
