import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BomWorkspace } from "./BomWorkspace";
import { useCircuitStore } from "@/store/circuit";

beforeEach(() => {
  useCircuitStore.getState().reset();
});

describe("BomWorkspace", () => {
  it("shows the empty state with no components", () => {
    render(<BomWorkspace />);
    expect(screen.getByText("No parts yet")).toBeInTheDocument();
  });

  it("derives rows live from the schematic and aggregates quantity", () => {
    const s = useCircuitStore.getState();
    s.addComponent("resistor", 0, 0);
    s.addComponent("resistor", 50, 0); // same value → qty 2
    s.addComponent("led", 100, 0);
    render(<BomWorkspace />);
    expect(screen.getByText("2 unique parts")).toBeInTheDocument();
    expect(screen.getByText("R1, R2")).toBeInTheDocument();
  });

  it("filters rows by description", () => {
    const s = useCircuitStore.getState();
    s.addComponent("resistor", 0, 0);
    s.addComponent("led", 50, 0);
    render(<BomWorkspace />);
    fireEvent.change(screen.getByLabelText("Filter BOM"), { target: { value: "LED" } });
    expect(screen.getAllByText("LED").length).toBeGreaterThan(0);
    expect(screen.queryByText("Resistor")).not.toBeInTheDocument();
  });
});
