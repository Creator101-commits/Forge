import { describe, it, expect, beforeEach } from "vitest";
import {
  useCircuitStore,
  computeErc,
  worldPins,
  applyTransform,
  snap,
  type SchematicComponent,
  type Net,
} from "./circuit";

beforeEach(() => {
  useCircuitStore.getState().reset();
});

describe("geometry", () => {
  it("snaps to the 10px grid", () => {
    expect(snap(13)).toBe(10);
    expect(snap(16)).toBe(20);
    expect(snap(-4)).toBe(-0);
  });

  it("applies translate with no rotation", () => {
    expect(applyTransform(30, 0, { x: 100, y: 50, rotation: 0, mirrored: false })).toEqual([
      130, 50,
    ]);
  });

  it("rotates a pin 90° about the component center", () => {
    const [x, y] = applyTransform(30, 0, { x: 0, y: 0, rotation: 90, mirrored: false });
    expect(Math.round(x)).toBe(0);
    expect(Math.round(y)).toBe(30);
  });

  it("mirrors across the vertical axis", () => {
    expect(applyTransform(30, 0, { x: 0, y: 0, rotation: 0, mirrored: true })).toEqual([-30, 0]);
  });
});

describe("component placement", () => {
  it("auto-increments reference designators per prefix", () => {
    const s = useCircuitStore.getState();
    const r1 = s.addComponent("resistor", 0, 0);
    const r2 = s.addComponent("resistor", 50, 0);
    const c1 = s.addComponent("capacitor", 100, 0);
    expect(r1.refDes).toBe("R1");
    expect(r2.refDes).toBe("R2");
    expect(c1.refDes).toBe("C1");
  });

  it("snaps placement to the grid and selects the new component", () => {
    const comp = useCircuitStore.getState().addComponent("resistor", 13, 27);
    expect(comp.x).toBe(10);
    expect(comp.y).toBe(30);
    expect(useCircuitStore.getState().selectedId).toBe(comp.id);
  });

  it("removing a component drops wires touching its pins", () => {
    const s = useCircuitStore.getState();
    const r = s.addComponent("resistor", 0, 0); // pins at (-30,0) and (30,0)
    s.beginWire(-30, 0);
    s.commitWire(-30, 50);
    expect(useCircuitStore.getState().wires).toHaveLength(1);
    useCircuitStore.getState().removeComponent(r.id);
    expect(useCircuitStore.getState().wires).toHaveLength(0);
  });

  it("rotate advances by 90 and wraps", () => {
    const s = useCircuitStore.getState();
    const r = s.addComponent("resistor", 0, 0);
    for (let i = 0; i < 4; i++) useCircuitStore.getState().rotateComponent(r.id);
    expect(useCircuitStore.getState().components[0]?.rotation).toBe(0);
  });
});

describe("wiring", () => {
  it("creates a net and an orthogonal route", () => {
    const s = useCircuitStore.getState();
    s.beginWire(0, 0);
    const w = s.commitWire(40, 30);
    expect(w).not.toBeNull();
    expect(useCircuitStore.getState().nets).toHaveLength(1);
    // horizontal-then-vertical → 3 points
    expect(w!.points).toEqual([
      [0, 0],
      [40, 0],
      [40, 30],
    ]);
  });

  it("reuses an existing net when an endpoint coincides", () => {
    const s = useCircuitStore.getState();
    s.beginWire(0, 0);
    const a = s.commitWire(40, 0);
    s.beginWire(40, 0);
    const b = s.commitWire(40, 40);
    expect(a!.netId).toBe(b!.netId);
    expect(useCircuitStore.getState().nets).toHaveLength(1);
  });
});

describe("ERC (mirrors circuit_ops::run_erc)", () => {
  const comp = (id: string, refDes: string): SchematicComponent => ({
    id,
    refDes,
    symbolId: "resistor",
    value: "10k",
    x: 0,
    y: 0,
    rotation: 0,
    mirrored: false,
  });

  it("flags floating pins on a lone passive component", () => {
    const issues = computeErc([comp("c1", "R1")], [], []);
    expect(issues.filter((i) => i.code === "floating_pin").length).toBeGreaterThan(0);
  });

  it("exempts power pins from floating checks", () => {
    const gnd: SchematicComponent = { ...comp("g1", "GND1"), symbolId: "gnd" };
    const pins = worldPins([gnd]);
    expect(pins.every((p) => p.electricalType === "power")).toBe(true);
    const issues = computeErc([gnd], [], []);
    expect(issues.some((i) => i.code === "floating_pin")).toBe(false);
  });

  it("detects duplicate reference designators", () => {
    const issues = computeErc([comp("c1", "R1"), comp("c2", "R1")], [], []);
    const dup = issues.find((i) => i.code === "duplicate_ref");
    expect(dup?.severity).toBe("Error");
  });

  it("detects missing power and ground nets", () => {
    const issues = computeErc([], [], []);
    expect(issues.some((i) => i.code === "missing_gnd")).toBe(true);
    expect(issues.some((i) => i.code === "missing_power")).toBe(true);
  });

  it("is satisfied with GND and VCC nets present", () => {
    const nets: Net[] = [
      { id: "n1", name: "GND", class: "ground" },
      { id: "n2", name: "+5V", class: "power" },
    ];
    const issues = computeErc([], [], nets);
    expect(issues.some((i) => i.code === "missing_gnd")).toBe(false);
    expect(issues.some((i) => i.code === "missing_power")).toBe(false);
  });

  it("runErc stores issues on the store", () => {
    useCircuitStore.getState().addComponent("resistor", 0, 0);
    const issues = useCircuitStore.getState().runErc();
    expect(issues).toBe(useCircuitStore.getState().erc);
    expect(issues.length).toBeGreaterThan(0);
  });
});
