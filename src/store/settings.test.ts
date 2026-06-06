import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Settings } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { useSettingsStore } from "./settings";

const defaults: Settings = {
  theme: "dark",
  density: "comfortable",
  reduced_motion: false,
  telemetry_enabled: false,
  default_ai_provider: null,
  default_board: null,
};

beforeEach(() => {
  useSettingsStore.setState({ settings: defaults, loaded: false });
  document.documentElement.className = "";
  vi.clearAllMocks();
});

describe("settings store", () => {
  it("loadSettings applies the persisted theme to the document", async () => {
    vi.mocked(ipc.getSettings).mockResolvedValue({ ...defaults, theme: "light" });
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().loaded).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("updateSettings persists and toggles reduced-motion class", async () => {
    vi.mocked(ipc.setSettings).mockImplementation(async (s) => s);
    await useSettingsStore.getState().updateSettings({ reduced_motion: true });
    expect(ipc.setSettings).toHaveBeenCalled();
    expect(useSettingsStore.getState().settings.reduced_motion).toBe(true);
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(true);
  });

  it("loadSettings falls back to defaults when IPC fails", async () => {
    vi.mocked(ipc.getSettings).mockRejectedValue(new Error("no shell"));
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().settings).toEqual(defaults);
    expect(useSettingsStore.getState().loaded).toBe(true);
  });
});
