import { describe, it, expect } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./AppShell";
import { WORKSPACES } from "./workspaces";
import { useUiStore } from "@/store/ui";

const rail = () => within(screen.getByTestId("activity-rail"));

async function waitForWorkspace(testId: string) {
  await waitFor(() => expect(screen.getByTestId(testId)).toBeInTheDocument());
}

describe("AppShell", () => {
  it("renders the title bar, activity rail, bottom dock, and status bar", () => {
    render(<AppShell />);
    expect(screen.getByTestId("title-bar")).toBeInTheDocument();
    expect(screen.getByTestId("activity-rail")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-dock")).toBeInTheDocument();
    expect(screen.getByTestId("status-bar")).toBeInTheDocument();
  });

  it("renders all workspace icons with accessible labels", () => {
    render(<AppShell />);
    for (const ws of WORKSPACES) {
      expect(rail().getByRole("tab", { name: ws.label })).toBeInTheDocument();
    }
    expect(WORKSPACES).toHaveLength(10);
  });

  it("switches workspace when an activity-rail icon is clicked", async () => {
    useUiStore.setState({ activeWorkspace: "dashboard" });
    const user = userEvent.setup();
    render(<AppShell />);

    await user.click(rail().getByRole("tab", { name: "CAD" }));
    expect(useUiStore.getState().activeWorkspace).toBe("cad");
    await waitForWorkspace("workspace-cad");

    await user.click(rail().getByRole("tab", { name: "Code" }));
    expect(useUiStore.getState().activeWorkspace).toBe("code");
    await waitForWorkspace("workspace-code");
  });

  it("marks the active workspace tab as selected", () => {
    useUiStore.setState({ activeWorkspace: "ai" });
    render(<AppShell />);
    expect(rail().getByRole("tab", { name: "AI" })).toHaveAttribute("aria-selected", "true");
    expect(rail().getByRole("tab", { name: "PCB" })).toHaveAttribute("aria-selected", "false");
  });
});
