import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SerialPortInfo } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  listSerialPorts: vi.fn(),
  connectSerial: vi.fn(),
  disconnectSerial: vi.fn(),
  sendSerialData: vi.fn(),
  onEvent: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { useSerialStore } from "./serial";

const ports: SerialPortInfo[] = [
  { name: "/dev/ttyUSB0", kind: "usb" },
  { name: "/dev/ttyACM0", kind: "usb" },
];

beforeEach(() => {
  useSerialStore.setState({
    ports: [],
    status: "disconnected",
    port: null,
    baud: 9600,
    lines: [],
    error: null,
    partial: "",
    nextId: 1,
  });
  vi.clearAllMocks();
});

describe("serial store", () => {
  it("refreshPorts loads ports and defaults the selection", async () => {
    vi.mocked(ipc.listSerialPorts).mockResolvedValue(ports);
    await useSerialStore.getState().refreshPorts();
    expect(useSerialStore.getState().ports).toHaveLength(2);
    expect(useSerialStore.getState().port).toBe("/dev/ttyUSB0");
  });

  it("follows the idle -> connecting -> connected -> error -> reconnect machine", async () => {
    const seen: string[] = [];
    const unsub = useSerialStore.subscribe((s) => seen.push(s.status));

    // idle -> connecting -> connected
    vi.mocked(ipc.connectSerial).mockResolvedValueOnce(undefined);
    await useSerialStore.getState().connect("/dev/ttyUSB0", 115200);
    expect(useSerialStore.getState().status).toBe("connected");

    // connected -> (disconnect) -> connecting -> error
    vi.mocked(ipc.disconnectSerial).mockResolvedValueOnce(undefined);
    await useSerialStore.getState().disconnect();
    vi.mocked(ipc.connectSerial).mockRejectedValueOnce({ message: "port busy" });
    await expect(useSerialStore.getState().connect("/dev/ttyUSB0", 115200)).rejects.toBeTruthy();
    expect(useSerialStore.getState().status).toBe("error");
    expect(useSerialStore.getState().error).toContain("port busy");

    // error -> reconnect (connecting -> connected)
    vi.mocked(ipc.connectSerial).mockResolvedValueOnce(undefined);
    await useSerialStore.getState().connect("/dev/ttyUSB0", 115200);
    expect(useSerialStore.getState().status).toBe("connected");

    unsub();
    expect(seen).toContain("connecting");
    expect(seen).toContain("connected");
    expect(seen).toContain("disconnected");
    expect(seen).toContain("error");
  });

  it("assembles incoming chunks into timestamped lines, buffering partials", () => {
    const store = useSerialStore.getState();
    store.appendData("hel");
    store.appendData("lo\nwor");
    expect(useSerialStore.getState().lines.map((l) => l.text)).toEqual(["hello"]);
    expect(useSerialStore.getState().partial).toBe("wor");

    store.appendData("ld\r\n");
    const lines = useSerialStore.getState().lines;
    expect(lines.map((l) => l.text)).toEqual(["hello", "world"]);
    expect(lines[1]!.ts).toBeGreaterThan(0);
  });

  it("send delegates to IPC", async () => {
    vi.mocked(ipc.sendSerialData).mockResolvedValue(undefined);
    await useSerialStore.getState().send("AT\n");
    expect(ipc.sendSerialData).toHaveBeenCalledWith("AT\n");
  });
});
