import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SchematicCanvas } from "./SchematicCanvas";
import { useCircuitStore } from "@/store/circuit";

beforeEach(() => {
  useCircuitStore.getState().reset();
});

describe("SchematicCanvas", () => {
  it("renders the SVG canvas", () => {
    render(<SchematicCanvas />);
    expect(screen.getByTestId("schematic-canvas")).toBeInTheDocument();
  });

  it("renders components from the store", () => {
    const s = useCircuitStore.getState();
    s.addComponent("resistor", 0, 0);
    render(<SchematicCanvas />);
    expect(screen.getByTestId("sch-comp-R1")).toBeInTheDocument();
  });

  it("renders wires from the store", () => {
    const s = useCircuitStore.getState();
    s.beginWire(0, 0);
    s.commitWire(40, 30);
    render(<SchematicCanvas />);
    const wires = screen.getByTestId("schematic-canvas").querySelectorAll("polyline");
    expect(wires.length).toBeGreaterThan(0);
  });

  it("changes cursor class based on tool", () => {
    useCircuitStore.setState({ tool: "wire" });
    render(<SchematicCanvas />);
    expect(screen.getByTestId("schematic-canvas")).toHaveClass("cursor-cell");
  });

  it("selects a component on click", () => {
    const s = useCircuitStore.getState();
    const comp = s.addComponent("resistor", 0, 0);
    s.select(null);
    render(<SchematicCanvas />);
    fireEvent.pointerDown(screen.getByTestId("sch-comp-R1"));
    expect(useCircuitStore.getState().selectedId).toBe(comp.id);
  });

  it("deletes a component in delete mode", () => {
    useCircuitStore.setState({ tool: "delete" });
    const s = useCircuitStore.getState();
    s.addComponent("resistor", 0, 0);
    render(<SchematicCanvas />);
    fireEvent.pointerDown(screen.getByTestId("sch-comp-R1"));
    expect(useCircuitStore.getState().components).toHaveLength(0);
  });
});
