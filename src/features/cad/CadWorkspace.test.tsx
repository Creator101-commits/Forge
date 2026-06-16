import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CadWorkspace } from "./CadWorkspace";
import { useCadStore } from "@/store/cad";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  TransformControls: () => null,
  Text: () => null,
}));

beforeEach(() => {
  useCadStore.getState().reset();
});

describe("CadWorkspace", () => {
  it("renders the workspace", () => {
    render(<CadWorkspace />);
    expect(screen.getByTestId("workspace-cad")).toBeInTheDocument();
  });

  it("renders all toolbar buttons", () => {
    render(<CadWorkspace />);
    expect(screen.getByTitle("Select")).toBeInTheDocument();
    expect(screen.getByTitle("Move")).toBeInTheDocument();
    expect(screen.getByTitle("Rotate")).toBeInTheDocument();
    expect(screen.getByTitle("Scale")).toBeInTheDocument();
    expect(screen.getByTitle("Add primitive")).toBeInTheDocument();
    const deleteBtns = screen.getAllByTitle("Delete");
    expect(deleteBtns.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all view buttons", () => {
    render(<CadWorkspace />);
    expect(screen.getByText("Perspective")).toBeInTheDocument();
    expect(screen.getByText("Top")).toBeInTheDocument();
    expect(screen.getByText("Front")).toBeInTheDocument();
    expect(screen.getByText("Right")).toBeInTheDocument();
  });

  it("switches view when a view button is clicked", () => {
    render(<CadWorkspace />);
    fireEvent.click(screen.getByText("Top"));
    expect(screen.getByText("Top")).toHaveClass("bg-accent");
    expect(screen.getByText("Perspective")).not.toHaveClass("bg-accent");
  });

  it("shows initial status bar info", () => {
    render(<CadWorkspace />);
    expect(
      screen.getByText((content) => content.includes("View: Perspective")),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("Objects: 0")),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("Units: mm")),
    ).toBeInTheDocument();
  });
});
