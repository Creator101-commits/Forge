import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SerialPortInfo } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  listSerialPorts: vi.fn(),
  connectSerial: vi.fn(),
  disconnectSerial: vi.fn(),
  sendSerialData: vi.fn(),
  onEvent: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { SerialMonitor } from "./SerialMonitor";
import { useSerialStore } from "@/store/serial";

const ports: SerialPortInfo[] = [{ name: "/dev/ttyUSB0", kind: "usb" }];

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
  vi.mocked(ipc.listSerialPorts).mockResolvedValue(ports);
  vi.mocked(ipc.connectSerial).mockResolvedValue(undefined);
  vi.mocked(ipc.disconnectSerial).mockResolvedValue(undefined);
  vi.mocked(ipc.sendSerialData).mockResolvedValue(undefined);
  vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
});

describe("SerialMonitor", () => {
  it("renders a received line with a timestamp", async () => {
    render(<SerialMonitor />);
    act(() => {
      useSerialStore.getState().appendData("Hello from device\n");
    });
    expect(await screen.findByText("Hello from device")).toBeInTheDocument();
    const log = screen.getByTestId("serial-log");
    expect(log.textContent).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
  });

  it("connects through IPC when a port is selected", async () => {
    const user = userEvent.setup();
    render(<SerialMonitor />);
    await waitFor(() => expect(useSerialStore.getState().port).toBe("/dev/ttyUSB0"));

    await user.click(screen.getByRole("button", { name: /connect/i }));
    expect(ipc.connectSerial).toHaveBeenCalledWith({ port: "/dev/ttyUSB0", baud: 9600 });
  });
});
