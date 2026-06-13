import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlockCanvas } from "./BlockCanvas";
import { useBlocksStore } from "@/store/blocks";

beforeEach(() => useBlocksStore.getState().reset());

describe("BlockCanvas", () => {
  it("adds a block from the toolbar", () => {
    render(<BlockCanvas />);
    fireEvent.click(screen.getByText("MCU"));
    expect(useBlocksStore.getState().blocks).toHaveLength(1);
    expect(screen.getByText("1 blocks")).toBeInTheDocument();
  });

  it("shows the connect hint while a connection is in progress", () => {
    const s = useBlocksStore.getState();
    const a = s.addBlock("mcu", 0, 0);
    s.addBlock("sensor", 200, 0);
    s.beginConnect(a.id); // arm before render so the subscribed component reads it
    render(<BlockCanvas />);
    expect(screen.getByText(/click a target block/i)).toBeInTheDocument();
  });

  it("renders connection count", () => {
    const s = useBlocksStore.getState();
    const a = s.addBlock("power", 0, 0);
    const b = s.addBlock("mcu", 200, 0);
    s.beginConnect(a.id);
    s.completeConnect(b.id, "5V");
    render(<BlockCanvas />);
    expect(screen.getByText("1 connections")).toBeInTheDocument();
    expect(screen.getByText("5V")).toBeInTheDocument();
  });
});
