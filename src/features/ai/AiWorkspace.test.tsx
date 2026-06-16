import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiWorkspace } from "./AiWorkspace";

describe("AiWorkspace", () => {
  it("renders the workspace with correct testid", () => {
    render(<AiWorkspace />);
    expect(screen.getByTestId("workspace-ai")).toBeInTheDocument();
  });

  it("shows the AI Assistant heading", () => {
    render(<AiWorkspace />);
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("describes the AI chat location", () => {
    render(<AiWorkspace />);
    expect(screen.getByText(/bottom dock/i)).toBeInTheDocument();
  });
});
