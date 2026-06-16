import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BreadboardCanvas } from "./BreadboardCanvas";
import { useBreadboardStore, JUMPER_COLORS } from "@/store/breadboard";

beforeEach(() => {
  useBreadboardStore.getState().reset();
});

describe("BreadboardCanvas", () => {
  it("renders the SVG canvas", () => {
    render(<BreadboardCanvas />);
    expect(screen.getByTestId("breadboard-canvas")).toBeInTheDocument();
  });

  it("shows the default jumper count", () => {
    render(<BreadboardCanvas />);
    expect(screen.getByText("0 jumpers")).toBeInTheDocument();
  });

  it("renders jumper color buttons", () => {
    render(<BreadboardCanvas />);
    for (const c of JUMPER_COLORS) {
      expect(screen.getByLabelText(`jumper color ${c}`)).toBeInTheDocument();
    }
  });

  it("updates the selected color when a color button is clicked", () => {
    render(<BreadboardCanvas />);
    const second = JUMPER_COLORS[1]!;
    fireEvent.click(screen.getByLabelText(`jumper color ${second}`));
    expect(useBreadboardStore.getState().color).toBe(second);
  });

  it("shows pending hint when a hole is clicked", () => {
    render(<BreadboardCanvas />);
    const hole = document.querySelector('[data-testid^="hole-"]');
    expect(hole).toBeInTheDocument();
    fireEvent.click(hole!);
    expect(screen.getByText(/click a second hole/i)).toBeInTheDocument();
  });

  it("renders a jumper and shows updated count", () => {
    const s = useBreadboardStore.getState();
    const holes = s.holes;
    s.holeClick(holes[0]!.id);
    s.holeClick(holes[2]!.id);
    render(<BreadboardCanvas />);
    expect(screen.getByText("1 jumpers")).toBeInTheDocument();
  });
});
