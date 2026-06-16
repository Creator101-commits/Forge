import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Toolchain, BoardInfo, CompileResult } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  onEvent: vi.fn().mockResolvedValue(() => {}),
  listDir: vi.fn().mockResolvedValue([]),
  compileDetectToolchains: vi.fn().mockResolvedValue([]),
  compileListBoards: vi.fn().mockResolvedValue([]),
  compileSketch: vi.fn().mockResolvedValue({ success: true, output: "", artifactPath: null, durationMs: 0, toolchainMissing: false }),
  uploadFirmware: vi.fn().mockResolvedValue({ success: true, output: "", artifactPath: null, durationMs: 0, toolchainMissing: false }),
}));

import * as ipc from "@/lib/ipc";
import { CompileWorkspace } from "./CompileWorkspace";

const toolchains: Toolchain[] = [
  { id: "arduino", name: "Arduino CLI", installed: true, version: "0.35.0" },
  { id: "avr-gcc", name: "AVR-GCC", installed: true, version: "12.2.0" },
];

const boards: BoardInfo[] = [
  { port: "/dev/cu.usbmodem101", boardName: "Arduino Uno", fqbn: "arduino:avr:uno" },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
  vi.mocked(ipc.listDir).mockResolvedValue([]);
  vi.mocked(ipc.compileDetectToolchains).mockResolvedValue(toolchains);
  vi.mocked(ipc.compileListBoards).mockResolvedValue(boards);
  vi.mocked(ipc.compileSketch).mockResolvedValue({ success: true, output: "", artifactPath: null, durationMs: 0, toolchainMissing: false });
  vi.mocked(ipc.uploadFirmware).mockResolvedValue({ success: true, output: "", artifactPath: null, durationMs: 0, toolchainMissing: false });
});

describe("CompileWorkspace", () => {
  it("renders the compile workspace", async () => {
    render(<CompileWorkspace />);
    expect(screen.getByTestId("workspace-compile")).toBeInTheDocument();
  });

  it("detects toolchains and boards on mount", async () => {
    render(<CompileWorkspace />);
    await waitFor(() => {
      expect(ipc.compileDetectToolchains).toHaveBeenCalled();
      expect(ipc.compileListBoards).toHaveBeenCalled();
    });
  });

  it("shows toolchain status after detection", async () => {
    render(<CompileWorkspace />);
    await waitFor(() => {
      expect(screen.getByText(/Arduino CLI: installed/)).toBeInTheDocument();
      expect(screen.getByText(/AVR-GCC: installed/)).toBeInTheDocument();
    });
  });

  it("disables Compile button without sketch path", async () => {
    render(<CompileWorkspace />);
    await waitFor(() => {
      expect(screen.getByText("Compile")).toBeDisabled();
    });
  });

  it("enables Compile button when sketch path is entered", async () => {
    const user = userEvent.setup();
    render(<CompileWorkspace />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("arduino:avr:uno")).toBeInTheDocument();
    });
    const sketchInput = screen.getByPlaceholderText("/path/to/sketch");
    await user.type(sketchInput, "/tmp/sketch");
    expect(screen.getByText("Compile")).not.toBeDisabled();
  });

  it("shows compile output after compilation", async () => {
    const result: CompileResult = {
      success: true,
      output: "Compilation successful",
      artifactPath: null,
      durationMs: 1500,
      toolchainMissing: false,
    };
    vi.mocked(ipc.compileSketch).mockResolvedValue(result);
    const user = userEvent.setup();
    render(<CompileWorkspace />);
    const sketchInput = screen.getByPlaceholderText("/path/to/sketch");
    await user.type(sketchInput, "/tmp/sketch");
    await user.click(screen.getByText("Compile"));
    await waitFor(() => {
      expect(screen.getByText(/Compilation successful/)).toBeInTheDocument();
    });
  });
});
