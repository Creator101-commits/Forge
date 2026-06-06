import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SearchHit } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  searchProject: vi.fn(),
  readFile: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { SearchPanel } from "./SearchPanel";
import { useCodeStore } from "@/store/code";

const hit: SearchHit = {
  path: "code/main.ino",
  line: 4,
  column: 5,
  line_text: "  // TODO: blink the LED",
};

beforeEach(() => {
  useCodeStore.setState({ tabs: [], activePath: null, pendingReveal: null });
  vi.clearAllMocks();
  vi.mocked(ipc.searchProject).mockResolvedValue([hit]);
  vi.mocked(ipc.readFile).mockResolvedValue("...");
});

describe("SearchPanel", () => {
  it("runs a project search and renders hits", async () => {
    const user = userEvent.setup();
    render(<SearchPanel />);
    await user.type(screen.getByLabelText("Search project"), "TODO{Enter}");

    expect(await screen.findByText("// TODO: blink the LED")).toBeInTheDocument();
    expect(ipc.searchProject).toHaveBeenCalledWith(expect.objectContaining({ query: "TODO" }));
  });

  it("navigates to a hit when clicked", async () => {
    const user = userEvent.setup();
    render(<SearchPanel />);
    await user.type(screen.getByLabelText("Search project"), "TODO{Enter}");
    await user.click(await screen.findByText("// TODO: blink the LED"));

    await waitFor(() =>
      expect(useCodeStore.getState().pendingReveal).toEqual({
        path: "code/main.ino",
        line: 4,
        column: 5,
      }),
    );
  });
});
