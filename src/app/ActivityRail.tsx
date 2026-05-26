import { clsx } from "clsx";
import { useUiStore } from "@/store/ui";
import { WORKSPACES } from "./workspaces";

export function ActivityRail() {
  const active = useUiStore((s) => s.activeWorkspace);
  const setActive = useUiStore((s) => s.setActiveWorkspace);

  return (
    <nav
      aria-label="Workspaces"
      data-testid="activity-rail"
      className="flex h-full w-12 flex-col items-center gap-1 border-r border-border-1 bg-bg-1 py-2"
    >
      {WORKSPACES.map((ws) => {
        const Icon = ws.icon;
        const isActive = active === ws.id;
        return (
          <button
            key={ws.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={ws.label}
            title={ws.label}
            onClick={() => setActive(ws.id)}
            data-workspace={ws.id}
            className={clsx(
              "relative grid h-9 w-9 place-items-center rounded-2 transition-colors",
              isActive
                ? "bg-accent-soft text-accent"
                : "text-text-3 hover:bg-surface-1 hover:text-text-1",
            )}
          >
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-accent"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
