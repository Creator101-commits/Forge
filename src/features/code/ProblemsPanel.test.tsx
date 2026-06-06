import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Diagnostic } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  listDiagnostics: vi.fn(),
  readFile: vi.fn(),
  onEvent: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { ProblemsPanel } from "./ProblemsPanel";
import { useCodeStore } from "@/store/code";
import { useDiagnosticsStore } from "@/store/diagnostics";

const diagnostic: Diagnostic = {
  file: "code/main.ino",
  range: { start_line: 12, start_col: 3, end_line: 12, end_col: 9 },
  severity: "error",
  message: "expected ';' before '}'",
  source: "synthetic",
};

beforeEach(() => {
  useCodeStore.setState({ tabs: [], activePath: null, pendingReveal: null });
  useDiagnosticsStore.setState({ items: [] });
  vi.clearAllMocks();
  vi.mocked(ipc.listDiagnostics).mockResolvedValue([diagnostic]);
  vi.mocked(ipc.readFile).mockResolvedValue("void setup(){}");
  vi.mocked(ipc.onEvent).mockResolvedValue(() => {});
});

describe("ProblemsPanel", () => {
  it("shows a synthetic diagnostic", async () => {
    render(<ProblemsPanel />);
    expect(await screen.findByText("expected ';' before '}'")).toBeInTheDocument();
  });

  it("navigates to the diagnostic's range when clicked", async () => {
    const user = userEvent.setup();
    render(<ProblemsPanel />);
    await user.click(await screen.findByText("expected ';' before '}'"));

    await waitFor(() =>
      expect(useCodeStore.getState().pendingReveal).toEqual({
        path: "code/main.ino",
        line: 12,
        column: 3,
      }),
    );
    expect(ipc.readFile).toHaveBeenCalledWith("code/main.ino");
  });
});
