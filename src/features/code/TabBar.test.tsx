import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/ipc", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { TabBar } from "./TabBar";
import { useCodeStore } from "@/store/code";

beforeEach(async () => {
  useCodeStore.setState({ tabs: [], activePath: null, pendingReveal: null });
  vi.clearAllMocks();
  vi.mocked(ipc.readFile).mockResolvedValue("orig");
  await useCodeStore.getState().openFile("a.ino");
  await useCodeStore.getState().openFile("b.ino");
});

describe("TabBar", () => {
  it("shows a dirty marker only on edited tabs and persists across tab switches", async () => {
    useCodeStore.getState().updateContent("a.ino", "edited");
    render(<TabBar />);

    expect(screen.getByTestId("dirty-a.ino")).toBeInTheDocument();
    expect(screen.queryByTestId("dirty-b.ino")).not.toBeInTheDocument();
  });

  it("activates a tab when its label is clicked", async () => {
    const user = userEvent.setup();
    render(<TabBar />);
    await user.click(screen.getByText("a.ino"));
    expect(useCodeStore.getState().activePath).toBe("a.ino");
  });

  it("closes a tab via its close button", async () => {
    const user = userEvent.setup();
    render(<TabBar />);
    await user.click(screen.getByRole("button", { name: "Close b.ino" }));
    expect(useCodeStore.getState().tabs.map((t) => t.path)).toEqual(["a.ino"]);
  });
});
