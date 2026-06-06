import { useEffect, useState } from "react";
import { Cpu } from "lucide-react";
import * as ipc from "@/lib/ipc";
import type { BoardProfile } from "@/lib/ipc";
import { useProjectStore } from "@/store/project";
import { useSettingsStore } from "@/store/settings";

export function BoardPicker() {
  const [boards, setBoards] = useState<BoardProfile[]>([]);
  const current = useProjectStore((s) => s.current);
  const patchCurrent = useProjectStore((s) => s.patchCurrent);
  const saveProject = useProjectStore((s) => s.saveProject);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  useEffect(() => {
    void (async () => {
      try {
        setBoards(await ipc.listBoardProfiles());
      } catch {
        setBoards([]);
      }
    })();
  }, []);

  const selected = current?.board_target ?? "";

  const choose = async (id: string) => {
    patchCurrent({ board_target: id || null });
    await saveProject();
    if (id) await updateSettings({ default_board: id });
  };

  return (
    <label className="flex items-center gap-1.5 text-xs text-text-3" title="Target board">
      <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">Target board</span>
      <select
        aria-label="Target board"
        value={selected}
        disabled={!current}
        onChange={(e) => void choose(e.target.value)}
        className="rounded-1 border border-border-1 bg-bg-2 px-2 py-1 text-xs text-text-1 disabled:opacity-50"
      >
        <option value="">No board</option>
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}
