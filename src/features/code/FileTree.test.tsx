import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DirEntry, FsChange } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  listDir: vi.fn(),
  readFile: vi.fn(),
  onEvent: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { FileTree } from "./FileTree";
import { useCodeStore } from "@/store/code";

const file = (name: string): DirEntry => ({ name, path: name, is_dir: false, size: 1 });

let fsHandler: (c: FsChange) => void = () => {};
let listing: DirEntry[] = [];

beforeEach(() => {
  useCodeStore.setState({ tabs: [], activePath: null, pendingReveal: null });
  vi.clearAllMocks();
  listing = [file("main.ino")];
  vi.mocked(ipc.listDir).mockImplementation(async () => listing);
  vi.mocked(ipc.readFile).mockResolvedValue("void setup(){}");
  vi.mocked(ipc.onEvent).mockImplementation(async (_e, handler) => {
    fsHandler = handler as (c: FsChange) => void;
    return () => {};
  });
});

describe("FileTree", () => {
  it("renders entries from list_dir", async () => {
    render(<FileTree />);
    expect(await screen.findByText("main.ino")).toBeInTheDocument();
  });

  it("reflects filesystem changes via the watcher", async () => {
    render(<FileTree />);
    await screen.findByText("main.ino");

    // A new file appears on disk; the watcher fires and the tree refreshes.
    listing = [file("main.ino"), file("blink.ino")];
    fsHandler({ kind: "created", paths: ["blink.ino"] });

    await waitFor(() => expect(screen.getByText("blink.ino")).toBeInTheDocument());
  });

  it("opens a file into a tab when clicked", async () => {
    const user = userEvent.setup();
    render(<FileTree />);
    await user.click(await screen.findByText("main.ino"));
    await waitFor(() => expect(useCodeStore.getState().activePath).toBe("main.ino"));
    expect(ipc.readFile).toHaveBeenCalledWith("main.ino");
  });
});
