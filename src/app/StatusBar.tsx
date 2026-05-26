import { useUiStore } from "@/store/ui";

export function StatusBar() {
  const active = useUiStore((s) => s.activeWorkspace);
  return (
    <footer
      data-testid="status-bar"
      className="flex h-6 items-center justify-between border-t border-border-1 bg-bg-1 px-3 text-[11px] text-text-3"
    >
      <div className="flex items-center gap-3">
        <span data-testid="status-workspace">{active}</span>
        <span aria-hidden="true">•</span>
        <span>No project</span>
      </div>
      <div className="flex items-center gap-3">
        <span>v0.1.0</span>
        <span aria-hidden="true">•</span>
        <span>AI: not configured</span>
      </div>
    </footer>
  );
}
