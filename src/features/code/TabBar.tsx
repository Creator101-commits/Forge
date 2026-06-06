import { clsx } from "clsx";
import { X } from "lucide-react";
import { useCodeStore, isDirty } from "@/store/code";

export function TabBar() {
  const tabs = useCodeStore((s) => s.tabs);
  const activePath = useCodeStore((s) => s.activePath);
  const setActive = useCodeStore((s) => s.setActive);
  const closeTab = useCodeStore((s) => s.closeTab);

  if (tabs.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Open files"
      className="flex h-9 items-stretch overflow-x-auto border-b border-border-1 bg-bg-1"
    >
      {tabs.map((tab) => {
        const active = tab.path === activePath;
        const dirty = isDirty(tab);
        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={active}
            className={clsx(
              "group flex items-center gap-2 border-r border-border-1 px-3 text-xs",
              active ? "bg-bg-0 text-text-1" : "bg-bg-1 text-text-3 hover:text-text-1",
            )}
          >
            <button
              type="button"
              onClick={() => setActive(tab.path)}
              className="flex items-center gap-2"
            >
              <span>{tab.name}</span>
              {dirty && (
                <span
                  data-testid={`dirty-${tab.name}`}
                  aria-label="unsaved changes"
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                />
              )}
            </button>
            <button
              type="button"
              aria-label={`Close ${tab.name}`}
              onClick={() => closeTab(tab.path)}
              className="rounded-1 p-0.5 text-text-3 opacity-0 hover:bg-surface-1 hover:text-text-1 group-hover:opacity-100"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
