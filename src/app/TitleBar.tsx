import { Search } from "lucide-react";
import { isMac } from "@/lib/platform";

export function TitleBar() {
  const mod = isMac() ? "\u2318" : "Ctrl";
  return (
    <div
      data-testid="title-bar"
      data-tauri-drag-region
      className="flex h-9 items-center justify-between border-b border-border-1 bg-bg-1 px-3"
    >
      <div className="flex items-center gap-2 text-text-2">
        <span className="font-display text-sm tracking-wide text-text-1">Forge</span>
        <span className="text-xs text-text-3">— hardware engineering IDE</span>
      </div>

      <button
        type="button"
        aria-label="Open command palette"
        className="group flex items-center gap-2 rounded-2 border border-border-1 bg-surface-1 px-2 py-1 text-xs text-text-2 hover:border-border-2 hover:text-text-1 transition-colors"
        onClick={() => {
          /* M1 wires this to the command palette */
        }}
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Search or run command</span>
        <kbd className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-text-3">
          {mod}+K
        </kbd>
      </button>

      <div className="w-24" aria-hidden="true" />
    </div>
  );
}
