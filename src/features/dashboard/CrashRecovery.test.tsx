import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CrashRecovery } from "./CrashRecovery";
import { useEventLogStore } from "@/store/eventLog";

beforeEach(() => {
  useEventLogStore.setState({
    hasOrphanedLog: false,
    recovered: false,
  });
});

describe("CrashRecovery", () => {
  it("does not render when no orphaned log", () => {
    const { container } = render(<CrashRecovery />);
    expect(container.innerHTML).toBe("");
  });

  it("renders the recovery modal when orphaned log exists", () => {
    useEventLogStore.setState({ hasOrphanedLog: true });
    render(<CrashRecovery />);
    expect(screen.getByText("Unexpected Shutdown")).toBeInTheDocument();
    expect(
      screen.getByText(/detected an unexpected shutdown/),
    ).toBeInTheDocument();
  });

  it("clears the log on 'Start Fresh' click", async () => {
    const user = userEvent.setup();
    useEventLogStore.setState({ hasOrphanedLog: true });
    render(<CrashRecovery />);

    await user.click(screen.getByText("Start Fresh"));
    await waitFor(() => {
      expect(useEventLogStore.getState().hasOrphanedLog).toBe(false);
    });
  });

  it("marks recovered on 'Restore' click", async () => {
    const user = userEvent.setup();
    useEventLogStore.setState({ hasOrphanedLog: true });
    render(<CrashRecovery />);

    await user.click(screen.getByText("Restore"));
    await waitFor(() => {
      expect(useEventLogStore.getState().hasOrphanedLog).toBe(false);
      expect(useEventLogStore.getState().recovered).toBe(true);
    });
  });
});
