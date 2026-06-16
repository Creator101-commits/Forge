import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LadderCanvas } from "./LadderCanvas";
import { useLadderStore } from "@/store/ladder";

beforeEach(() => {
  useLadderStore.getState().reset();
});

describe("LadderCanvas", () => {
  it("shows the empty state prompt", () => {
    render(<LadderCanvas />);
    expect(screen.getByText(/Add a rung/i)).toBeInTheDocument();
  });

  it("adds a rung when the Rung button is clicked", () => {
    render(<LadderCanvas />);
    fireEvent.click(screen.getByText("Rung"));
    expect(useLadderStore.getState().rungs).toHaveLength(1);
  });

  it("adds a rung and renders it", () => {
    render(<LadderCanvas />);
    fireEvent.click(screen.getByText("Rung"));
    expect(screen.getByTestId("rung-r1")).toBeInTheDocument();
  });

  it("shows add-element buttons on a rung", () => {
    useLadderStore.getState().addRung();
    render(<LadderCanvas />);
    expect(screen.getByTitle("Add NO contact")).toBeInTheDocument();
    expect(screen.getByTitle("Add NC contact")).toBeInTheDocument();
    expect(screen.getByTitle("Add Coil")).toBeInTheDocument();
  });

  it("adds an element to a rung", () => {
    useLadderStore.getState().addRung();
    render(<LadderCanvas />);
    fireEvent.click(screen.getByTitle("Add NO contact"));
    expect(useLadderStore.getState().rungs[0]?.elements).toHaveLength(1);
  });

  it("shows simulator toggles when a contact exists", () => {
    const s = useLadderStore.getState();
    s.addRung();
    s.addElement("r1", "no", "Start");
    render(<LadderCanvas />);
    expect(screen.getByText("Start=0")).toBeInTheDocument();
  });

  it("toggles a contact in the simulator", () => {
    const s = useLadderStore.getState();
    s.addRung();
    s.addElement("r1", "no", "Start");
    render(<LadderCanvas />);
    fireEvent.click(screen.getByText("Start=0"));
    expect(screen.getByText("Start=1")).toBeInTheDocument();
  });

  it("removes a rung", () => {
    const s = useLadderStore.getState();
    s.addRung();
    render(<LadderCanvas />);
    fireEvent.click(screen.getByTitle("Delete rung"));
    expect(useLadderStore.getState().rungs).toHaveLength(0);
  });
});
