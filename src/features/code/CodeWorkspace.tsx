import { useEffect } from "react";
import { TabBar } from "./TabBar";
import { EditorPane } from "./EditorPane";
import { BoardPicker } from "./BoardPicker";
import * as ipc from "@/lib/ipc";
import { useProjectStore } from "@/store/project";

export function CodeWorkspace() {
  const hasProject = useProjectStore((s) => s.current !== null);

  // Start the filesystem watcher for the active project so the tree + tabs
  // react to external changes.
  useEffect(() => {
    if (hasProject) void ipc.watchPath().catch(() => {});
  }, [hasProject]);

  return (
    <div data-testid="workspace-code" className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border-1 bg-bg-1 px-3 py-1.5">
        <BoardPicker />
        <span className="ml-auto text-xs text-text-3">Compile &amp; upload arrive in M9</span>
      </div>
      <TabBar />
      <div className="min-h-0 flex-1">
        <EditorPane />
      </div>
    </div>
  );
}
