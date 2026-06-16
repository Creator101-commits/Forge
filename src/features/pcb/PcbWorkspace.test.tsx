import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PcbWorkspace } from "./PcbWorkspace";

describe("PcbWorkspace", () => {
  it("renders the workspace", () => {
    render(<PcbWorkspace />);
    expect(screen.getByTestId("workspace-pcb")).toBeInTheDocument();
  });

  it("renders the Select tool active by default", () => {
    render(<PcbWorkspace />);
    expect(screen.getByTitle("Select")).toBeInTheDocument();
  });

  it("renders all toolbar buttons", () => {
    render(<PcbWorkspace />);
    expect(screen.getByTitle("Place footprint")).toBeInTheDocument();
    expect(screen.getByTitle("Route trace")).toBeInTheDocument();
    expect(screen.getByTitle("Delete")).toBeInTheDocument();
    expect(screen.getByTitle("Toggle grid")).toBeInTheDocument();
  });

  it("renders all layer names", () => {
    render(<PcbWorkspace />);
    expect(screen.getByText("Top Copper")).toBeInTheDocument();
    expect(screen.getByText("Bottom Copper")).toBeInTheDocument();
    expect(screen.getByText("Silkscreen")).toBeInTheDocument();
    expect(screen.getByText("Outline")).toBeInTheDocument();
  });

  it("shows initial board info", () => {
    render(<PcbWorkspace />);
    expect(screen.getByText(/Board: 50×30mm/)).toBeInTheDocument();
    expect(screen.getByText(/0 DRC issues/)).toBeInTheDocument();
    expect(screen.getByText(/Grid: 0.1mm/)).toBeInTheDocument();
  });

  it("switches active layer when a layer button is clicked", () => {
    render(<PcbWorkspace />);
    fireEvent.click(screen.getByText("Bottom Copper"));
    expect(screen.getByText("Bottom Copper").closest("button")).toHaveClass("text-accent");
  });

  it("toggles layer visibility", () => {
    render(<PcbWorkspace />);
    const layerBtn = screen.getByText("Top Copper").closest("button")!;
    const toggles = layerBtn.querySelectorAll("button");
    expect(toggles.length).toBeGreaterThan(0);
    fireEvent.click(toggles[0]!);
    expect(screen.getByText("Top Copper")).toHaveClass("opacity-50");
  });
});
