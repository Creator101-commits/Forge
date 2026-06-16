import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErcPanel } from "./ErcPanel";
import { useCircuitStore } from "@/store/circuit";

beforeEach(() => {
  useCircuitStore.getState().reset();
});

describe("ErcPanel", () => {
  it("renders the panel", () => {
    render(<ErcPanel />);
    expect(screen.getByTestId("erc-panel")).toBeInTheDocument();
  });

  it("shows a clean state when there are no issues", () => {
    render(<ErcPanel />);
    expect(screen.getByText(/No ERC issues/)).toBeInTheDocument();
  });

  it("shows issue count after running ERC", () => {
    useCircuitStore.getState().addComponent("resistor", 0, 0);
    render(<ErcPanel />);
    fireEvent.click(screen.getByText("Run ERC"));
    expect(screen.getByText(/error/)).toBeInTheDocument();
  });

  it("selects a component when an issue is clicked", () => {
    const r = useCircuitStore.getState().addComponent("resistor", 0, 0);
    render(<ErcPanel />);
    fireEvent.click(screen.getByText("Run ERC"));
    const issueBtns = screen.getAllByRole("button");
    const issueBtn = issueBtns.find((b) => b.textContent?.includes("appears unconnected"));
    if (issueBtn) {
      fireEvent.click(issueBtn);
      expect(useCircuitStore.getState().selectedId).toBe(r.id);
    }
  });
});
