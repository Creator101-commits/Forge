import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SymbolPalette } from "./SymbolPalette";
import { useCircuitStore } from "@/store/circuit";

beforeEach(() => {
  useCircuitStore.getState().reset();
});

describe("SymbolPalette", () => {
  it("renders the palette", () => {
    render(<SymbolPalette />);
    expect(screen.getByTestId("symbol-palette")).toBeInTheDocument();
  });

  it("renders category headings", () => {
    render(<SymbolPalette />);
    expect(screen.getByText("Passive")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Power")).toBeInTheDocument();
  });

  it("renders symbol buttons with names", () => {
    render(<SymbolPalette />);
    expect(screen.getByTitle("Place Resistor")).toBeInTheDocument();
    expect(screen.getByTitle("Place Capacitor")).toBeInTheDocument();
    expect(screen.getByTitle("Place GND")).toBeInTheDocument();
  });

  it("arms placement when a symbol is clicked", () => {
    render(<SymbolPalette />);
    fireEvent.click(screen.getByTitle("Place Resistor"));
    expect(useCircuitStore.getState().tool).toBe("place");
    expect(useCircuitStore.getState().placingSymbolId).toBe("resistor");
  });

  it("marks the active symbol as pressed", () => {
    render(<SymbolPalette />);
    fireEvent.click(screen.getByTitle("Place Resistor"));
    expect(screen.getByTitle("Place Resistor")).toHaveAttribute("aria-pressed", "true");
  });
});
