import { useUiStore } from "@/store/ui";
import { useProjectStore } from "@/store/project";

export function StatusBar() {
  const active = useUiStore((s) => s.activeWorkspace);
  const project = useProjectStore((s) => s.current);
  const dirty = useProjectStore((s) => s.dirty);
  return (
    <footer
      data-testid="status-bar"
      className="flex h-6 items-center justify-between border-t border-border-1 bg-bg-1 px-3 text-[11px] text-text-3"
    >
      <div className="flex items-center gap-3">
        <span data-testid="status-workspace">{active}</span>
        <span aria-hidden="true">•</span>
        <span data-testid="status-project">
          {project ? `${project.name}${dirty ? " •" : ""}` : "No project"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span>v0.2.0</span>
        <span aria-hidden="true">•</span>
        <span>AI: not configured</span>
      </div>
    </footer>
  );
}
