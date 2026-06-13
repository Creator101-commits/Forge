import { create } from "zustand";

/**
 * Block-diagram editor store (M5).
 *
 * A lightweight, self-contained graph of labeled system blocks and directional
 * connections, used by the Circuit workspace's "Block Diagram" mode. Kept
 * independent of the schematic graph; an AI action can later convert one to the
 * other.
 */

export type BlockCategory = "power" | "mcu" | "sensor" | "actuator" | "comms" | "generic";

export interface Block {
  id: string;
  label: string;
  category: BlockCategory;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  /** Optional protocol/signal label, e.g. "I2C", "5V". */
  label?: string;
}

export const BLOCK_COLORS: Record<BlockCategory, string> = {
  power: "var(--warn)",
  mcu: "var(--accent)",
  sensor: "var(--ok)",
  actuator: "var(--error)",
  comms: "#8b9cff",
  generic: "var(--text-3)",
};

export interface BlocksState {
  blocks: Block[];
  connections: Connection[];
  selectedId: string | null;
  /** Block id chosen as the source while drawing a connection. */
  connectFrom: string | null;
  seq: number;

  addBlock: (category: BlockCategory, x: number, y: number, label?: string) => Block;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, x: number, y: number) => void;
  renameBlock: (id: string, label: string) => void;
  select: (id: string | null) => void;
  beginConnect: (id: string) => void;
  completeConnect: (toId: string, label?: string) => Connection | null;
  cancelConnect: () => void;
  reset: () => void;
}

const DEFAULT_LABEL: Record<BlockCategory, string> = {
  power: "Power",
  mcu: "MCU",
  sensor: "Sensor",
  actuator: "Actuator",
  comms: "Comms",
  generic: "Block",
};

export const useBlocksStore = create<BlocksState>((set, get) => ({
  blocks: [],
  connections: [],
  selectedId: null,
  connectFrom: null,
  seq: 1,

  addBlock: (category, x, y, label) => {
    const id = `b${get().seq}`;
    const block: Block = {
      id,
      label: label ?? DEFAULT_LABEL[category],
      category,
      x,
      y,
      width: 120,
      height: 56,
    };
    set((s) => ({ blocks: [...s.blocks, block], selectedId: id, seq: s.seq + 1 }));
    return block;
  },

  removeBlock: (id) =>
    set((s) => ({
      blocks: s.blocks.filter((b) => b.id !== id),
      connections: s.connections.filter((c) => c.from !== id && c.to !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      connectFrom: s.connectFrom === id ? null : s.connectFrom,
    })),

  moveBlock: (id, x, y) =>
    set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? { ...b, x, y } : b)) })),

  renameBlock: (id, label) =>
    set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? { ...b, label } : b)) })),

  select: (id) => set({ selectedId: id }),

  beginConnect: (id) => set({ connectFrom: id }),

  completeConnect: (toId, label) => {
    const from = get().connectFrom;
    if (!from || from === toId) {
      set({ connectFrom: null });
      return null;
    }
    // Avoid duplicate edges in the same direction.
    const exists = get().connections.some((c) => c.from === from && c.to === toId);
    if (exists) {
      set({ connectFrom: null });
      return null;
    }
    const conn: Connection = { id: `e${get().seq}`, from, to: toId, label };
    set((s) => ({ connections: [...s.connections, conn], connectFrom: null, seq: s.seq + 1 }));
    return conn;
  },

  cancelConnect: () => set({ connectFrom: null }),

  reset: () =>
    set({ blocks: [], connections: [], selectedId: null, connectFrom: null, seq: 1 }),
}));
