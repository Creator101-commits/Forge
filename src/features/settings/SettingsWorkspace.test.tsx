import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Settings } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { SettingsWorkspace } from "./SettingsWorkspace";
import { useSettingsStore } from "@/store/settings";

const defaults: Settings = {
  theme: "dark",
  density: "comfortable",
  reduced_motion: false,
  telemetry_enabled: false,
  default_ai_provider: null,
};

beforeEach(() => {
  useSettingsStore.setState({ settings: defaults, loaded: false });
  document.documentElement.className = "";
  vi.clearAllMocks();
});

describe("SettingsWorkspace", () => {
  it("changes theme and persists; value survives a simulated restart", async () => {
    // Backing store: setSettings records the last saved value, getSettings returns it.
    let saved: Settings = defaults;
    vi.mocked(ipc.getSettings).mockImplementation(async () => saved);
    vi.mocked(ipc.setSettings).mockImplementation(async (s) => {
      saved = s;
      return s;
    });

    const user = userEvent.setup();
    render(<SettingsWorkspace />);
    await waitFor(() => expect(ipc.getSettings).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Light" }));
    await waitFor(() => expect(saved.theme).toBe("light"));
    expect(document.documentElement.classList.contains("light")).toBe(true);

    // Simulate an app restart: reset store, reload from persistence.
    useSettingsStore.setState({ settings: defaults, loaded: false });
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().settings.theme).toBe("light");
  });

  it("toggles the reduced-motion switch", async () => {
    vi.mocked(ipc.getSettings).mockResolvedValue(defaults);
    vi.mocked(ipc.setSettings).mockImplementation(async (s) => s);
    const user = userEvent.setup();
    render(<SettingsWorkspace />);

    const sw = screen.getByRole("switch", { name: "Reduce motion" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.click(sw);
    await waitFor(() => expect(useSettingsStore.getState().settings.reduced_motion).toBe(true));
  });
});
