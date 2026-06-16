import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { DirEntry } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  listDir: vi.fn(),
  readFile: vi.fn(),
  onEvent: vi.fn(),
  searchProject: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { CodeSidebar } from "./CodeSidebar";
import { useCodeStore } from "@/store/code";

const file = (name: string): DirEntry => ({ name, path: name, is_dir: false, size: 1 });

beforeEach(() => {
  useCodeStore.setState({ tabs: [], activePath: null, pendingReveal: null });
  vi.clearAllMocks();
  vi.mocked(ipc.listDir).mockResolvedValue([file("main.ino")]);
  vi.mocked(ipc.readFile).mockResolvedValue("");
  vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
  vi.mocked(ipc.searchProject).mockResolvedValue([]);
});

describe("CodeSidebar", () => {
  it("renders the sidebar with Explorer and Search tabs", () => {
    render(<CodeSidebar />);
    const tablist = screen.getByRole("tablist", { name: "Code sidebar" });
    expect(tablist).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Explorer" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Search" })).toBeInTheDocument();
  });

  it("shows Explorer tab as active by default", () => {
    render(<CodeSidebar />);
    expect(screen.getByRole("tab", { name: "Explorer" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Search" })).toHaveAttribute("aria-selected", "false");
  });

  it("switches to Search panel when Search tab is clicked", async () => {
    render(<CodeSidebar />);
    fireEvent.click(screen.getByRole("tab", { name: "Search" }));
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Search" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: "Explorer" })).toHaveAttribute("aria-selected", "false");
    });
  });

  it("renders FileTree content by default", async () => {
    render(<CodeSidebar />);
    await waitFor(() => {
      expect(screen.getByText("main.ino")).toBeInTheDocument();
    });
  });
});
