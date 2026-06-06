import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { FolderPlus, FolderOpen, Sparkles, Clock, FileStack, ChevronRight } from "lucide-react";
import { useProjectStore } from "@/store/project";
import { useUiStore } from "@/store/ui";
import { TEMPLATES } from "./templates";

type Pane = "none" | "new" | "open";

export function Dashboard() {
  const recents = useProjectStore((s) => s.recents);
  const loadRecents = useProjectStore((s) => s.loadRecents);
  const openProject = useProjectStore((s) => s.openProject);
  const error = useProjectStore((s) => s.error);
  const [pane, setPane] = useState<Pane>("none");

  useEffect(() => {
    void loadRecents();
  }, [loadRecents]);

  return (
    <section
      data-testid="workspace-dashboard"
      className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6 overflow-auto p-8"
    >
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl text-text-1">Forge</h1>
        <p className="text-sm text-text-3">Start a hardware project or reopen a recent one.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <ActionButton
          icon={FolderPlus}
          label="New Project"
          onClick={() => setPane(pane === "new" ? "none" : "new")}
        />
        <ActionButton
          icon={FolderOpen}
          label="Open…"
          onClick={() => setPane(pane === "open" ? "none" : "open")}
        />
        <ActionButton
          icon={Sparkles}
          label="Open Demo"
          title="The Temperature Monitor demo ships in M10"
          disabled
        />
      </div>

      {pane === "new" && <NewProjectForm onDone={() => setPane("none")} />}
      {pane === "open" && <OpenProjectForm onDone={() => setPane("none")} />}

      {error && (
        <div
          role="alert"
          className="rounded-2 border border-error/40 bg-error/10 px-3 py-2 text-xs text-error"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel title="Recent" icon={Clock}>
          {recents.length === 0 ? (
            <p data-testid="recents-empty" className="text-sm text-text-3">
              No recent projects yet. Create or open one to get started.
            </p>
          ) : (
            <ul data-testid="recents-list" className="flex flex-col gap-1">
              {recents.map((r) => (
                <li key={r.path}>
                  <button
                    type="button"
                    onClick={() => void openProject(r.path)}
                    className="group flex w-full items-center justify-between rounded-2 border border-transparent px-2 py-2 text-left hover:border-border-1 hover:bg-surface-1"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-text-1">{r.name}</span>
                      <span className="truncate text-xs text-text-3">{r.path}</span>
                    </span>
                    <span className="ml-3 shrink-0 text-[11px] text-text-3">
                      {formatRelative(r.opened_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Templates" icon={FileStack}>
          <ul className="flex flex-col gap-1">
            {TEMPLATES.map((t) => (
              <li key={t.id}>
                <div className="flex items-start gap-2 rounded-2 px-2 py-2 text-text-2">
                  <ChevronRight
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-3"
                    aria-hidden="true"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm text-text-1">{t.name}</span>
                    <span className="text-xs text-text-3">{t.description}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </section>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: typeof FolderPlus;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "flex items-center gap-2 rounded-2 border border-border-1 bg-surface-1 px-3 py-2 text-sm transition-colors",
        disabled
          ? "cursor-not-allowed text-text-3 opacity-60"
          : "text-text-1 hover:border-border-2 hover:bg-surface-2",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <div className="panel flex min-h-0 flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-text-3">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </div>
      {children}
    </div>
  );
}

function NewProjectForm({ onDone }: { onDone: () => void }) {
  const createProject = useProjectStore((s) => s.createProject);
  const setWorkspace = useUiStore((s) => s.setActiveWorkspace);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim() || busy) return;
    setBusy(true);
    try {
      await createProject(path.trim(), name.trim());
      onDone();
      setWorkspace("code");
    } catch {
      /* error surfaced via store */
    } finally {
      setBusy(false);
    }
  };

  return (
    <form aria-label="New project" onSubmit={submit} className="panel flex flex-col gap-3 p-4">
      <Field label="Project name">
        <input
          aria-label="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Temperature Monitor"
          className="input"
          autoFocus
        />
      </Field>
      <Field label="Location (folder path)">
        <input
          aria-label="Location"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/Users/you/Projects/temp-monitor"
          className="input font-mono"
        />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn-ghost">
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !name.trim() || !path.trim()}
          className="btn-accent"
        >
          {busy ? "Creating…" : "Create Project"}
        </button>
      </div>
    </form>
  );
}

function OpenProjectForm({ onDone }: { onDone: () => void }) {
  const openProject = useProjectStore((s) => s.openProject);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim() || busy) return;
    setBusy(true);
    try {
      await openProject(path.trim());
      onDone();
    } catch {
      /* error surfaced via store */
    } finally {
      setBusy(false);
    }
  };

  return (
    <form aria-label="Open project" onSubmit={submit} className="panel flex flex-col gap-3 p-4">
      <Field label="Project folder path">
        <input
          aria-label="Project folder path"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/Users/you/Projects/temp-monitor"
          className="input font-mono"
          autoFocus
        />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={busy || !path.trim()} className="btn-accent">
          {busy ? "Opening…" : "Open Project"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-2">
      <span className="text-text-3">{label}</span>
      {children}
    </label>
  );
}

function formatRelative(epochSeconds: number): string {
  const diff = Date.now() / 1000 - epochSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
