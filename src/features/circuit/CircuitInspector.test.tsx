import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CircuitInspector } from "./CircuitInspector";
import { useCircuitStore } from "@/store/circuit";

beforeEach(() => {
  useCircuitStore.getState().reset();
});

describe("CircuitInspector", () => {
  it("shows empty state when no component is selected", () => {
    render(<CircuitInspector />);
    expect(screen.getByText("No component selected.")).toBeInTheDocument();
  });

  it("displays component info when a component is selected", () => {
    const s = useCircuitStore.getState();
    const comp = s.addComponent("resistor", 0, 0);
    s.select(comp.id);
    render(<CircuitInspector />);
    expect(screen.getByTestId("circuit-inspector")).toBeInTheDocument();
    expect(screen.getByText("R1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10k")).toBeInTheDocument();
    expect(screen.getByText("Resistor")).toBeInTheDocument();
  });

  it("shows position and rotation info", () => {
    const s = useCircuitStore.getState();
    const comp = s.addComponent("resistor", 10, 20);
    s.select(comp.id);
    render(<CircuitInspector />);
    expect(screen.getByText(/10.*20.*0°/)).toBeInTheDocument();
  });

  it("rotates the component when Rotate is clicked", () => {
    const s = useCircuitStore.getState();
    const comp = s.addComponent("resistor", 0, 0);
    s.select(comp.id);
    render(<CircuitInspector />);
    fireEvent.click(screen.getByText("Rotate"));
    expect(useCircuitStore.getState().components[0]?.rotation).toBe(90);
  });

  it("mirrors the component when Mirror is clicked", () => {
    const s = useCircuitStore.getState();
    const comp = s.addComponent("resistor", 0, 0);
    s.select(comp.id);
    render(<CircuitInspector />);
    fireEvent.click(screen.getByText("Mirror"));
    expect(useCircuitStore.getState().components[0]?.mirrored).toBe(true);
  });

  it("deletes the component when Delete is clicked", () => {
    const s = useCircuitStore.getState();
    const comp = s.addComponent("resistor", 0, 0);
    s.select(comp.id);
    render(<CircuitInspector />);
    fireEvent.click(screen.getByText("Delete"));
    expect(useCircuitStore.getState().components).toHaveLength(0);
  });

  it("updates value when input changes", () => {
    const s = useCircuitStore.getState();
    const comp = s.addComponent("resistor", 0, 0);
    s.select(comp.id);
    render(<CircuitInspector />);
    const input = screen.getByLabelText("Component value");
    fireEvent.change(input, { target: { value: "100k" } });
    expect(useCircuitStore.getState().components[0]?.value).toBe("100k");
  });
});
