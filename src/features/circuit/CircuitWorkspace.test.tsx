import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CircuitWorkspace } from "./CircuitWorkspace";
import { SymbolPalette } from "./SymbolPalette";
import { ErcPanel } from "./ErcPanel";
import { useCircuitStore } from "@/store/circuit";

beforeEach(() => {
  useCircuitStore.getState().reset();
});

describe("CircuitWorkspace", () => {
  it("renders the schematic canvas by default", () => {
    render(<CircuitWorkspace />);
    expect(screen.getByTestId("schematic-canvas")).toBeInTheDocument();
  });

  it("switching modes swaps in that mode's editor", () => {
    render(<CircuitWorkspace />);
    fireEvent.click(screen.getByText("Ladder"));
    expect(screen.queryByTestId("schematic-canvas")).not.toBeInTheDocument();
    expect(screen.getByText(/add a rung/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Breadboard"));
    expect(screen.getByTestId("breadboard-canvas")).toBeInTheDocument();
  });

  it("selecting a tool updates the store and reflects pressed state", () => {
    render(<CircuitWorkspace />);
    const wire = screen.getByLabelText("Wire");
    fireEvent.click(wire);
    expect(useCircuitStore.getState().tool).toBe("wire");
    expect(wire).toHaveAttribute("aria-pressed", "true");
  });

  it("rotate/mirror are disabled with no selection", () => {
    render(<CircuitWorkspace />);
    expect(screen.getByLabelText("Rotate selection")).toBeDisabled();
  });

  it("component count reflects the store", () => {
    useCircuitStore.getState().addComponent("resistor", 0, 0);
    render(<CircuitWorkspace />);
    expect(screen.getByText("1 components")).toBeInTheDocument();
  });
});

describe("SymbolPalette", () => {
  it("arms placement for a picked symbol", () => {
    render(<SymbolPalette />);
    fireEvent.click(screen.getByTitle("Place Resistor"));
    expect(useCircuitStore.getState().tool).toBe("place");
    expect(useCircuitStore.getState().placingSymbolId).toBe("resistor");
  });
});

describe("ErcPanel", () => {
  it("runs ERC and lists issues; clicking selects the component", () => {
    const r = useCircuitStore.getState().addComponent("resistor", 0, 0);
    render(<ErcPanel />);
    fireEvent.click(screen.getByText("Run ERC"));
    // floating-pin warnings for the lone resistor should appear
    const floating = screen.getAllByText(/appears unconnected/i);
    expect(floating.length).toBeGreaterThan(0);
    fireEvent.click(floating[0]!.closest("button")!);
    expect(useCircuitStore.getState().selectedId).toBe(r.id);
  });
});
