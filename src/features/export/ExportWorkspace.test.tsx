import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  bomGenerate: vi.fn(),
  circuitListComponents: vi.fn(),
  pcbListFootprints: vi.fn(),
  cadListObjects: vi.fn(),
  exportBomCsv: vi.fn(),
  exportBomPdf: vi.fn(),
  exportSchematicSvg: vi.fn(),
  exportPcbGerbers: vi.fn(),
  exportCadScreenshot: vi.fn(),
  exportProjectBundle: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { ExportWorkspace } from "./ExportWorkspace";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ipc.bomGenerate).mockResolvedValue([]);
  vi.mocked(ipc.circuitListComponents).mockResolvedValue([]);
  vi.mocked(ipc.pcbListFootprints).mockResolvedValue([]);
  vi.mocked(ipc.cadListObjects).mockResolvedValue([]);
  vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
  vi.mocked(ipc.invoke).mockRejectedValue(new Error("not available"));
  vi.mocked(ipc.exportBomCsv).mockResolvedValue("exports/bom_20250101_120000.csv");
  vi.mocked(ipc.exportBomPdf).mockResolvedValue("exports/bom_20250101_120000.pdf");
  vi.mocked(ipc.exportSchematicSvg).mockResolvedValue("exports/schematic_20250101_120000.svg");
  vi.mocked(ipc.exportPcbGerbers).mockResolvedValue("exports/pcb_20250101_120000.zip");
  vi.mocked(ipc.exportCadScreenshot).mockResolvedValue("exports/cad_20250101_120000.png");
  vi.mocked(ipc.exportProjectBundle).mockResolvedValue("exports/project_20250101_120000.zip");
});

describe("ExportWorkspace", () => {
  it("renders the export workspace", () => {
    render(<ExportWorkspace />);
    expect(screen.getByTestId("workspace-export")).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(<ExportWorkspace />);
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("lists all export targets", () => {
    render(<ExportWorkspace />);
    expect(screen.getByText("BOM (CSV)")).toBeInTheDocument();
    expect(screen.getByText("BOM (PDF)")).toBeInTheDocument();
    expect(screen.getByText("Schematic (SVG)")).toBeInTheDocument();
    expect(screen.getByText("PCB Gerbers")).toBeInTheDocument();
    expect(screen.getByText("CAD Screenshot")).toBeInTheDocument();
    expect(screen.getByText("Project Bundle")).toBeInTheDocument();
  });

  it("shows export buttons with format labels", () => {
    render(<ExportWorkspace />);
    expect(screen.getByText("Export .csv")).toBeInTheDocument();
    expect(screen.getAllByText("Export .zip").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Exported state after clicking an export target", async () => {
    render(<ExportWorkspace />);
    fireEvent.click(screen.getByText("Export .csv"));
    expect(screen.getByText("Exporting...")).toBeInTheDocument();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByText("Exported")).toBeInTheDocument();
    expect(ipc.exportBomCsv).toHaveBeenCalled();
  });

  it("shows Export Everything button", () => {
    render(<ExportWorkspace />);
    expect(screen.getByText("Export Everything")).toBeInTheDocument();
  });
});
