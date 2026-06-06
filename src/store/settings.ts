import { create } from "zustand";
import * as ipc from "@/lib/ipc";
import type { Settings } from "@/lib/ipc";
import { applyAppearance } from "@/lib/theme";

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  density: "comfortable",
  reduced_motion: false,
  telemetry_enabled: false,
  default_ai_provider: null,
};

export interface SettingsState {
  settings: Settings;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  /** Persist a partial change and apply appearance side effects immediately. */
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: async () => {
    try {
      const settings = await ipc.getSettings();
      set({ settings, loaded: true });
      applyAppearance(settings);
    } catch {
      // Fall back to defaults (e.g. running outside the desktop shell).
      set({ loaded: true });
      applyAppearance(get().settings);
    }
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    // Optimistically apply UI so the toggle feels instant.
    set({ settings: next });
    applyAppearance(next);
    const saved = await ipc.setSettings(next);
    set({ settings: saved });
    applyAppearance(saved);
    return saved;
  },
}));
