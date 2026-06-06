import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { useUiStore } from "@/store/ui";
import { useProjectStore } from "@/store/project";
import { WORKSPACES } from "./workspaces";
import { createCommandIndex, searchCommands, type Command as PaletteCommand } from "@/lib/palette";

/** Builds the live command list from current store state + actions. */
function useCommands(): PaletteCommand[] {
  const setWorkspace = useUiStore((s) => s.setActiveWorkspace);
  const recents = useProjectStore((s) => s.recents);
  const openProject = useProjectStore((s) => s.openProject);
  const saveProject = useProjectStore((s) => s.saveProject);
  const closeProject = useProjectStore((s) => s.closeProject);
  const hasProject = useProjectStore((s) => s.current !== null);

  return useMemo(() => {
    const cmds: PaletteCommand[] = [];

    for (const ws of WORKSPACES) {
      cmds.push({
        id: `nav:${ws.id}`,
        title: `Go to ${ws.label}`,
        group: "Navigation",
        keywords: ["go", "navigate", "open", ws.label.toLowerCase()],
        run: () => setWorkspace(ws.id),
      });
    }

    cmds.push({
      id: "project:new",
      title: "New Project",
      group: "Project",
      keywords: ["create", "new", "project"],
      run: () => setWorkspace("dashboard"),
    });
    cmds.push({
      id: "project:open",
      title: "Open Project…",
      group: "Project",
      keywords: ["open", "project", "folder"],
      run: () => setWorkspace("dashboard"),
    });
    if (hasProject) {
      cmds.push({
        id: "project:save",
        title: "Save Project",
        group: "Project",
        keywords: ["save", "persist"],
        run: () => void saveProject(),
      });
      cmds.push({
        id: "project:close",
        title: "Close Project",
        group: "Project",
        keywords: ["close"],
        run: () => void closeProject(),
      });
    }

    for (const r of recents) {
      cmds.push({
        id: `recent:${r.path}`,
        title: `Open ${r.name}`,
        group: "Recent Projects",
        keywords: ["open", "recent", r.name.toLowerCase(), r.path.toLowerCase()],
        run: () => void openProject(r.path),
      });
    }

    return cmds;
  }, [setWorkspace, recents, openProject, saveProject, closeProject, hasProject]);
}

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState("");

  const commands = useCommands();
  const fuse = useMemo(() => createCommandIndex(commands), [commands]);
  const results = searchCommands(fuse, commands, query);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      shouldFilter={false}
      className="fixed left-1/2 top-[20%] z-[100] w-[min(640px,90vw)] -translate-x-1/2 overflow-hidden rounded-3 border border-border-1 bg-surface-1 shadow-2"
    >
      <Dialog.Title className="sr-only">Command palette</Dialog.Title>
      <Dialog.Description className="sr-only">Search or run a command.</Dialog.Description>
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search or run a command…"
        aria-label="Command palette input"
        className="w-full border-b border-border-1 bg-transparent px-4 py-3 text-sm text-text-1 outline-none placeholder:text-text-3"
      />
      <Command.List className="max-h-[50vh] overflow-auto p-1">
        <Command.Empty className="px-3 py-6 text-center text-sm text-text-3">
          No matching commands.
        </Command.Empty>
        {results.map((cmd) => (
          <Command.Item
            key={cmd.id}
            value={cmd.id}
            onSelect={() => {
              void cmd.run();
              setOpen(false);
            }}
            className="flex cursor-pointer items-center justify-between rounded-2 px-3 py-2 text-sm text-text-2 aria-selected:bg-accent-soft aria-selected:text-text-1"
          >
            <span className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-text-3">{cmd.group}</span>
              <span className="text-text-1">{cmd.title}</span>
            </span>
            {cmd.shortcut && (
              <kbd className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-text-3">
                {cmd.shortcut}
              </kbd>
            )}
          </Command.Item>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
