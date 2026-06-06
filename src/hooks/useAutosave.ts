/**
 * Autosave: while a project is open, periodically (every 10s) and on window
 * blur, append a snapshot of the current project to the backend `event_log`.
 * This powers crash recovery (see M10) without blocking the UI.
 */

import { useEffect } from "react";
import { useProjectStore } from "@/store/project";
import { appendEventLog } from "@/lib/ipc";

export const AUTOSAVE_INTERVAL_MS = 10_000;

export function useAutosave(intervalMs: number = AUTOSAVE_INTERVAL_MS): void {
  const current = useProjectStore((s) => s.current);

  useEffect(() => {
    if (!current) return;

    const snapshot = (reason: string) => {
      void appendEventLog("autosave", { reason, project: current }).catch(() => {
        /* best-effort: autosave failures must never surface to the user */
      });
    };

    const interval = setInterval(() => snapshot("interval"), intervalMs);
    const onBlur = () => snapshot("blur");
    window.addEventListener("blur", onBlur);

    return () => {
      clearInterval(interval);
      window.removeEventListener("blur", onBlur);
    };
  }, [current, intervalMs]);
}
