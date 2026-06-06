import { useMemo } from "react";
import { clsx } from "clsx";
import { useUiStore } from "@/store/ui";
import type { WorkspaceId } from "./workspaces";
import { TitleBar } from "./TitleBar";
import { StatusBar } from "./StatusBar";
import { ActivityRail } from "./ActivityRail";
import { BottomDock } from "./BottomDock";
import { Router } from "./Router";
import { CommandPalette } from "./CommandPalette";
import { useGlobalHotkeys, PALETTE_HOTKEY } from "@/lib/hotkeys";
import { useAutosave } from "@/hooks/useAutosave";

export function AppShell() {
  const active = useUiStore((s) => s.activeWorkspace);
  const leftOpen = useUiStore((s) => s.leftSidebarOpen);
  const rightOpen = useUiStore((s) => s.rightInspectorOpen);
  const bottomOpen = useUiStore((s) => s.bottomDockOpen);
  const togglePalette = useUiStore((s) => s.togglePalette);

  const hotkeys = useMemo(
    () => [{ hotkey: PALETTE_HOTKEY, handler: togglePalette }],
    [togglePalette],
  );
  useGlobalHotkeys(hotkeys);
  useAutosave();

  return (
    <div
      data-testid="app-shell"
      className="grid h-full w-full grid-rows-[36px_1fr_24px] bg-bg-0 text-text-1"
    >
      <TitleBar />

      <div className="grid min-h-0 grid-cols-[48px_minmax(0,1fr)]">
        <ActivityRail />

        <div
          className={clsx(
            "grid min-h-0 min-w-0",
            leftOpen ? "grid-cols-[240px_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)]",
          )}
        >
          {leftOpen && <SecondarySidebar workspace={active} />}

          <div className={clsx("grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto]")}>
            <div
              className={clsx(
                "grid min-h-0 min-w-0",
                rightOpen ? "grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-[minmax(0,1fr)]",
              )}
            >
              <main
                role="main"
                aria-label={`${active} workspace`}
                className="min-h-0 min-w-0 bg-bg-1 border-l border-border-1"
              >
                <Router workspace={active} />
              </main>
              {rightOpen && <Inspector workspace={active} />}
            </div>

            {bottomOpen && <BottomDock />}
          </div>
        </div>
      </div>

      <StatusBar />
      <CommandPalette />
    </div>
  );
}

function SecondarySidebar({ workspace }: { workspace: WorkspaceId }) {
  return (
    <aside
      aria-label="Secondary sidebar"
      className="min-h-0 overflow-auto border-l border-border-1 bg-bg-1 p-3 text-sm text-text-2"
    >
      <div className="mb-2 text-xs uppercase tracking-wider text-text-3">{workspace}</div>
      <div className="text-text-3">Contextual navigation appears here.</div>
    </aside>
  );
}

function Inspector({ workspace }: { workspace: WorkspaceId }) {
  return (
    <aside
      aria-label="Inspector"
      className="min-h-0 overflow-auto border-l border-border-1 bg-bg-1 p-3 text-sm"
    >
      <div className="mb-2 text-xs uppercase tracking-wider text-text-3">Inspector</div>
      <div className="text-text-3">Properties for selection in {workspace}.</div>
    </aside>
  );
}
