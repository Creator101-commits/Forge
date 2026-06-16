import { describe, it, expect, beforeEach } from "vitest";
import { useEventLogStore } from "./eventLog";

beforeEach(() => {
  useEventLogStore.setState({
    hasOrphanedLog: false,
    recovered: false,
  });
  localStorage.clear();
});

describe("eventLog store", () => {
  it("detects orphaned log from localStorage", () => {
    localStorage.setItem("forge:event_log:orphaned", "true");
    useEventLogStore.getState().checkOrphanedLog();
    expect(useEventLogStore.getState().hasOrphanedLog).toBe(true);
  });

  it("reports no orphaned log when absent", () => {
    useEventLogStore.getState().checkOrphanedLog();
    expect(useEventLogStore.getState().hasOrphanedLog).toBe(false);
  });

  it("marks recovered and clears localStorage", () => {
    localStorage.setItem("forge:event_log:orphaned", "true");
    useEventLogStore.getState().markRecovered();
    const s = useEventLogStore.getState();
    expect(s.hasOrphanedLog).toBe(false);
    expect(s.recovered).toBe(true);
    expect(localStorage.getItem("forge:event_log:orphaned")).toBeNull();
  });

  it("clears orphaned log without recovering", () => {
    localStorage.setItem("forge:event_log:orphaned", "true");
    useEventLogStore.getState().clearOrphanedLog();
    const s = useEventLogStore.getState();
    expect(s.hasOrphanedLog).toBe(false);
    expect(s.recovered).toBe(false);
    expect(localStorage.getItem("forge:event_log:orphaned")).toBeNull();
  });
});
