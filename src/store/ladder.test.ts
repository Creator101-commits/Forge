import { describe, it, expect, beforeEach } from "vitest";
import { useLadderStore, evaluateRung, type LadderElement } from "./ladder";

beforeEach(() => useLadderStore.getState().reset());

const el = (kind: LadderElement["kind"], label: string): LadderElement => ({
  id: `${kind}-${label}`,
  kind,
  label,
});

describe("evaluateRung", () => {
  it("NO contact passes when its variable is true", () => {
    const r = evaluateRung([el("no", "Start"), el("coil", "Motor")], { Start: true });
    expect(r).toEqual({ energized: true, coil: "Motor" });
  });

  it("NO contact blocks when false", () => {
    const r = evaluateRung([el("no", "Start"), el("coil", "Motor")], { Start: false });
    expect(r.energized).toBe(false);
  });

  it("NC contact passes when false and blocks when true", () => {
    expect(evaluateRung([el("nc", "Stop"), el("coil", "Y")], { Stop: false }).energized).toBe(true);
    expect(evaluateRung([el("nc", "Stop"), el("coil", "Y")], { Stop: true }).energized).toBe(false);
  });

  it("series contacts AND together (start AND not-stop)", () => {
    const rung = [el("no", "Start"), el("nc", "Stop"), el("coil", "Motor")];
    expect(evaluateRung(rung, { Start: true, Stop: false }).energized).toBe(true);
    expect(evaluateRung(rung, { Start: true, Stop: true }).energized).toBe(false);
    expect(evaluateRung(rung, { Start: false, Stop: false }).energized).toBe(false);
  });

  it("a rung with no contacts is always energized", () => {
    expect(evaluateRung([el("coil", "Y")], {}).energized).toBe(true);
  });
});

describe("ladder store", () => {
  it("adds rungs and elements", () => {
    const s = useLadderStore.getState();
    const r = s.addRung();
    s.addElement(r.id, "no", "Start");
    s.addElement(r.id, "coil", "Motor");
    const rung = useLadderStore.getState().rungs[0];
    expect(rung?.elements.map((e) => e.label)).toEqual(["Start", "Motor"]);
  });

  it("removes an element and a rung", () => {
    const s = useLadderStore.getState();
    const r = s.addRung();
    s.addElement(r.id, "no");
    const eid = useLadderStore.getState().rungs[0]!.elements[0]!.id;
    s.removeElement(r.id, eid);
    expect(useLadderStore.getState().rungs[0]!.elements).toHaveLength(0);
    s.removeRung(r.id);
    expect(useLadderStore.getState().rungs).toHaveLength(0);
  });

  it("relabels an element", () => {
    const s = useLadderStore.getState();
    const r = s.addRung();
    s.addElement(r.id, "no");
    const eid = useLadderStore.getState().rungs[0]!.elements[0]!.id;
    s.setLabel(r.id, eid, "E_Stop");
    expect(useLadderStore.getState().rungs[0]!.elements[0]!.label).toBe("E_Stop");
  });
});
