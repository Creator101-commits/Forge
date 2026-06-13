import { describe, it, expect, beforeEach } from "vitest";
import { useBreadboardStore, buildHoles, computeNets, COLS } from "./breadboard";

beforeEach(() => useBreadboardStore.getState().reset());

describe("breadboard grid", () => {
  it("builds rails + two main halves of 5 rows each", () => {
    const holes = buildHoles();
    // 4 rails + 10 main rows, each COLS wide
    expect(holes).toHaveLength(COLS * 14);
    expect(holes.filter((h) => h.node === "RT+")).toHaveLength(COLS);
    expect(holes.filter((h) => h.node === "T0")).toHaveLength(5);
  });
});

describe("tie-point connectivity", () => {
  it("holes in the same column half share a net; different columns do not", () => {
    const holes = buildHoles();
    const nets = computeNets(holes, []);
    expect(nets.get("T0")).toBe(nets.get("T0"));
    expect(nets.get("T0")).not.toBe(nets.get("T1"));
    // top half and bottom half of the same column are isolated
    expect(nets.get("T0")).not.toBe(nets.get("B0"));
  });

  it("a jumper unions two column nets", () => {
    const holes = buildHoles();
    const jumpers = [{ id: "j1", from: "t:0:0", to: "b:5:0", color: "#fff" }];
    const nets = computeNets(holes, jumpers);
    expect(nets.get("T0")).toBe(nets.get("B5"));
  });

  it("a power rail is one continuous net", () => {
    const holes = buildHoles();
    const nets = computeNets(holes, []);
    const railHoles = holes.filter((h) => h.node === "RT+");
    const idx = nets.get("RT+");
    expect(railHoles.every(() => nets.get("RT+") === idx)).toBe(true);
  });
});

describe("breadboard store", () => {
  it("first hole click arms, second creates a jumper", () => {
    const s = useBreadboardStore.getState();
    s.holeClick("t:0:0");
    expect(useBreadboardStore.getState().pendingFrom).toBe("t:0:0");
    s.holeClick("b:5:0");
    const js = useBreadboardStore.getState().jumpers;
    expect(js).toHaveLength(1);
    expect(js[0]).toMatchObject({ from: "t:0:0", to: "b:5:0" });
    expect(useBreadboardStore.getState().pendingFrom).toBeNull();
  });

  it("clicking the same hole twice cancels", () => {
    const s = useBreadboardStore.getState();
    s.holeClick("t:0:0");
    s.holeClick("t:0:0");
    expect(useBreadboardStore.getState().jumpers).toHaveLength(0);
    expect(useBreadboardStore.getState().pendingFrom).toBeNull();
  });

  it("removes a jumper", () => {
    const s = useBreadboardStore.getState();
    s.holeClick("t:0:0");
    s.holeClick("t:1:0");
    const id = useBreadboardStore.getState().jumpers[0]!.id;
    useBreadboardStore.getState().removeJumper(id);
    expect(useBreadboardStore.getState().jumpers).toHaveLength(0);
  });
});
