import { create } from "zustand";
import * as ipc from "@/lib/ipc";
import type { SerialPortInfo } from "@/lib/ipc";

export type SerialStatus = "disconnected" | "connecting" | "connected" | "error";

export interface SerialLine {
  id: number;
  /** Epoch milliseconds the line completed. */
  ts: number;
  text: string;
}

export interface SerialState {
  ports: SerialPortInfo[];
  status: SerialStatus;
  port: string | null;
  baud: number;
  lines: SerialLine[];
  error: string | null;
  partial: string;
  nextId: number;

  refreshPorts: () => Promise<void>;
  setPort: (port: string) => void;
  setBaud: (baud: number) => void;
  connect: (port: string, baud: number) => Promise<void>;
  disconnect: () => Promise<void>;
  send: (text: string) => Promise<void>;
  appendData: (chunk: string) => void;
  clear: () => void;
  subscribe: () => Promise<() => void>;
}

const MAX_LINES = 5000;

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e)
    return String((e as { message: unknown }).message);
  return String(e);
}

export const useSerialStore = create<SerialState>((set, get) => ({
  ports: [],
  status: "disconnected",
  port: null,
  baud: 9600,
  lines: [],
  error: null,
  partial: "",
  nextId: 1,

  refreshPorts: async () => {
    try {
      const ports = await ipc.listSerialPorts();
      set((s) => ({ ports, port: s.port ?? ports[0]?.name ?? null }));
    } catch (e) {
      set({ error: message(e) });
    }
  },

  setPort: (port) => set({ port }),
  setBaud: (baud) => set({ baud }),

  connect: async (port, baud) => {
    set({ status: "connecting", error: null, port, baud });
    try {
      await ipc.connectSerial({ port, baud });
      set({ status: "connected" });
    } catch (e) {
      set({ status: "error", error: message(e) });
      throw e;
    }
  },

  disconnect: async () => {
    try {
      await ipc.disconnectSerial();
    } catch {
      /* ignore */
    }
    set({ status: "disconnected" });
  },

  send: async (text) => {
    await ipc.sendSerialData(text);
  },

  appendData: (chunk) =>
    set((s) => {
      const combined = s.partial + chunk;
      const parts = combined.split("\n");
      const partial = parts.pop() ?? "";
      const now = Date.now();
      const additions: SerialLine[] = parts.map((text, i) => ({
        id: s.nextId + i,
        ts: now,
        text: text.replace(/\r$/, ""),
      }));
      const lines = [...s.lines, ...additions];
      return {
        lines: lines.length > MAX_LINES ? lines.slice(-MAX_LINES) : lines,
        partial,
        nextId: s.nextId + additions.length,
      };
    }),

  clear: () => set({ lines: [], partial: "" }),

  subscribe: async () => {
    const offData = await ipc.onEvent<string>("serial://data", (payload) => {
      get().appendData(payload);
    });
    const offStatus = await ipc.onEvent<string>("serial://status", (payload) => {
      if (payload === "connected" || payload === "disconnected") {
        set({ status: payload });
      }
    });
    return () => {
      offData();
      offStatus();
    };
  },
}));
