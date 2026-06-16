import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PcbCanvas } from "./PcbCanvas";
import { usePcbStore } from "@/store/pcb";

beforeEach(() => {
  usePcbStore.getState().reset();
});

describe("PcbCanvas", () => {
  it("renders the SVG canvas", () => {
    render(<PcbCanvas />);
    expect(screen.getByTestId("pcb-canvas")).toBeInTheDocument();
  });

  it("renders footprints from the store", () => {
    const s = usePcbStore.getState();
    s.addFootprint("r0805", 10, 10);
    render(<PcbCanvas />);
    expect(screen.getByTestId("fp-R1")).toBeInTheDocument();
  });

  it("renders multiple footprints with sequential refdes", () => {
    const s = usePcbStore.getState();
    s.addFootprint("r0805", 0, 0);
    s.addFootprint("led0805", 10, 0);
    render(<PcbCanvas />);
    expect(screen.getByTestId("fp-R1")).toBeInTheDocument();
    expect(screen.getByTestId("fp-D1")).toBeInTheDocument();
  });

  it("changes cursor style based on tool", () => {
    usePcbStore.setState({ tool: "place" });
    render(<PcbCanvas />);
    expect(screen.getByTestId("pcb-canvas")).toHaveStyle({ cursor: "crosshair" });
  });

  it("renders the board outline", () => {
    render(<PcbCanvas />);
    const svg = screen.getByTestId("pcb-canvas");
    expect(svg.querySelector("rect")).toBeInTheDocument();
  });

  it("selects a footprint on pointer down in select mode", () => {
    const s = usePcbStore.getState();
    const fp = s.addFootprint("r0805", 10, 10);
    s.select(null);
    render(<PcbCanvas />);
    fireEvent.pointerDown(screen.getByTestId("fp-R1"));
    expect(usePcbStore.getState().selectedId).toBe(fp.id);
  });
});
