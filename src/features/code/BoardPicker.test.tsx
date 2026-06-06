import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Project, BoardProfile } from "@/lib/ipc";

vi.mock("@/lib/ipc", () => ({
  listBoardProfiles: vi.fn(),
  saveProject: vi.fn(),
  setSettings: vi.fn(),
}));

import * as ipc from "@/lib/ipc";
import { BoardPicker } from "./BoardPicker";
import { useProjectStore } from "@/store/project";
import { useSettingsStore } from "@/store/settings";

const project: Project = {
  id: "p1",
  name: "Demo",
  description: null,
  created_at: 1,
  updated_at: 1,
  schema_version: 1,
  board_target: null,
} as unknown as Project;

const boards: BoardProfile[] = [
  {
    id: "uno",
    name: "Arduino Uno",
    mcu: "ATmega328P",
    default_baud: 9600,
    fqbn: "arduino:avr:uno",
  },
  {
    id: "esp32",
    name: "ESP32 Dev Module",
    mcu: "ESP32",
    default_baud: 115200,
    fqbn: "esp32:esp32:esp32",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  useProjectStore.setState({ current: project, dirty: false, status: "ready", error: null });
  useSettingsStore.setState({
    settings: {
      theme: "dark",
      density: "comfortable",
      reduced_motion: false,
      telemetry_enabled: false,
      default_ai_provider: null,
      default_board: null,
    },
    loaded: true,
  });
  vi.mocked(ipc.listBoardProfiles).mockResolvedValue(boards);
  vi.mocked(ipc.saveProject).mockImplementation(async (p) => p);
  vi.mocked(ipc.setSettings).mockImplementation(async (s) => s);
});

describe("BoardPicker", () => {
  it("persists the chosen board to the project and settings default", async () => {
    const user = userEvent.setup();
    render(<BoardPicker />);
    // Catalog loads.
    await screen.findByRole("option", { name: "ESP32 Dev Module" });

    await user.selectOptions(screen.getByLabelText("Target board"), "esp32");

    await waitFor(() => expect(useProjectStore.getState().current?.board_target).toBe("esp32"));
    expect(ipc.saveProject).toHaveBeenCalledWith(
      expect.objectContaining({ board_target: "esp32" }),
    );
    await waitFor(() =>
      expect(ipc.setSettings).toHaveBeenCalledWith(
        expect.objectContaining({ default_board: "esp32" }),
      ),
    );
  });
});
