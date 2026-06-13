import { describe, it, expect, beforeEach } from "vitest";
import { useBlocksStore } from "./blocks";

beforeEach(() => useBlocksStore.getState().reset());

describe("blocks store", () => {
  it("adds a block with a default label per category and selects it", () => {
    const b = useBlocksStore.getState().addBlock("mcu", 10, 20);
    expect(b.label).toBe("MCU");
    expect(useBlocksStore.getState().selectedId).toBe(b.id);
  });

  it("removes a block and any connections touching it", () => {
    const s = useBlocksStore.getState();
    const a = s.addBlock("power", 0, 0);
    const b = s.addBlock("mcu", 200, 0);
    s.beginConnect(a.id);
    s.completeConnect(b.id, "5V");
    expect(useBlocksStore.getState().connections).toHaveLength(1);
    useBlocksStore.getState().removeBlock(a.id);
    expect(useBlocksStore.getState().connections).toHaveLength(0);
    expect(useBlocksStore.getState().blocks).toHaveLength(1);
  });

  it("connects two blocks with a protocol label", () => {
    const s = useBlocksStore.getState();
    const a = s.addBlock("mcu", 0, 0);
    const b = s.addBlock("sensor", 200, 0);
    s.beginConnect(a.id);
    const c = s.completeConnect(b.id, "I2C");
    expect(c?.from).toBe(a.id);
    expect(c?.to).toBe(b.id);
    expect(c?.label).toBe("I2C");
  });

  it("rejects self-connections and duplicates", () => {
    const s = useBlocksStore.getState();
    const a = s.addBlock("mcu", 0, 0);
    const b = s.addBlock("sensor", 200, 0);
    s.beginConnect(a.id);
    expect(s.completeConnect(a.id)).toBeNull(); // self
    s.beginConnect(a.id);
    s.completeConnect(b.id);
    s.beginConnect(a.id);
    expect(s.completeConnect(b.id)).toBeNull(); // duplicate
    expect(useBlocksStore.getState().connections).toHaveLength(1);
  });

  it("renames and moves blocks", () => {
    const s = useBlocksStore.getState();
    const a = s.addBlock("generic", 0, 0);
    s.renameBlock(a.id, "Buck Converter");
    s.moveBlock(a.id, 50, 60);
    const updated = useBlocksStore.getState().blocks[0];
    expect(updated?.label).toBe("Buck Converter");
    expect(updated).toMatchObject({ x: 50, y: 60 });
  });
});
