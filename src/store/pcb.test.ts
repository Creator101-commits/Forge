import { describe, it, expect, beforeEach } from "vitest";
import { usePcbStore, computeDrc, resolvePads, type Footprint } from "./pcb";

beforeEach(() => usePcbStore.getState().reset());

describe("resolvePads", () => {
  it("places 0805 pads symmetrically about the origin", () => {
    const pads = resolvePads("r0805", 10, 5, 0);
    expect(pads).toHaveLength(2);
    expect(pads[0]).toMatchObject({ x: 9, y: 5 });
    expect(pads[1]).toMatchObject({ x: 11, y: 5 });
  });

  it("rotates pads about the footprint origin", () => {
    const pads = resolvePads("r0805", 0, 0, 90);
    expect(Math.round(pads[0]!.y)).toBe(-1);
  });
});

describe("placement", () => {
  it("auto-numbers references per prefix and resolves pads", () => {
    const s = usePcbStore.getState();
    const a = s.addFootprint("r0805", 0, 0);
    const b = s.addFootprint("r0805", 10, 0);
    expect(a.ref).toBe("R1");
    expect(b.ref).toBe("R2");
    expect(a.pads).toHaveLength(2);
  });

  it("removes a footprint", () => {
    const s = usePcbStore.getState();
    const a = s.addFootprint("led0805", 0, 0);
    s.removeFootprint(a.id);
    expect(usePcbStore.getState().footprints).toHaveLength(0);
  });
});

describe("routing", () => {
  it("two clicks create a trace and net-tag the touched pads", () => {
    const s = usePcbStore.getState();
    const fp = s.addFootprint("r0805", 0, 0); // pads at (-1,0),(1,0)
    s.routeClick(-1, 0);
    s.routeClick(20, 0);
    const st = usePcbStore.getState();
    expect(st.traces).toHaveLength(1);
    const pad = st.footprints[0]!.pads.find((p) => p.x === -1);
    expect(pad?.netId).toBe(st.traces[0]!.netId);
    void fp;
  });
});

describe("DRC (mirrors pcb_ops::run_drc)", () => {
  const fp = (id: string, ref: string, pads: Footprint["pads"]): Footprint => ({
    id,
    ref,
    libId: "r0805",
    x: 0,
    y: 0,
    rotation: 0,
    side: "top",
    pads,
  });

  it("warns on footprints with no pads", () => {
    const issues = computeDrc([fp("f1", "R1", [])], []);
    expect(issues.some((i) => i.code === "footprint_no_pads")).toBe(true);
  });

  it("warns on unconnected pads", () => {
    const pads = [{ name: "1", x: 0, y: 0, w: 1, h: 1, netId: null }];
    const issues = computeDrc([fp("f1", "R1", pads)], []);
    expect(issues.some((i) => i.code === "unconnected_pad")).toBe(true);
  });

  it("errors on a trace with fewer than 2 points", () => {
    const issues = computeDrc(
      [],
      [{ id: "t1", netId: "n1", layer: "top", points: [[0, 0]], width: 0.25 }],
    );
    const e = issues.find((i) => i.code === "invalid_trace");
    expect(e?.severity).toBe("Error");
  });

  it("flags a clearance violation between a trace and a foreign-net pad", () => {
    const pads = [{ name: "1", x: 5, y: 0, w: 1, h: 1, netId: "other" }];
    const issues = computeDrc(
      [fp("f1", "R1", pads)],
      [{ id: "t1", netId: "n1", layer: "top", points: [[0, 0], [10, 0]], width: 0.25 }],
    );
    expect(issues.some((i) => i.code === "clearance")).toBe(true);
  });

  it("runDrc stores results", () => {
    usePcbStore.getState().addFootprint("r0805", 0, 0);
    const issues = usePcbStore.getState().runDrc();
    expect(issues).toBe(usePcbStore.getState().drc);
  });
});
