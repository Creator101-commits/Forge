/**
 * Command registry + fuzzy index for the command palette.
 *
 * Commands are plain data with a `run` callback. The palette uses `fuse.js`
 * for ranking and `cmdk` for the keyboard-driven list UI.
 */

import Fuse from "fuse.js";
import type { IFuseOptions } from "fuse.js";

export interface Command {
  id: string;
  title: string;
  group: string;
  keywords?: string[];
  /** OS-aware shortcut label, if any. */
  shortcut?: string;
  run: () => void | Promise<void>;
}

const FUSE_OPTIONS: IFuseOptions<Command> = {
  keys: [
    { name: "title", weight: 0.6 },
    { name: "keywords", weight: 0.3 },
    { name: "group", weight: 0.1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
};

export function createCommandIndex(commands: Command[]): Fuse<Command> {
  return new Fuse(commands, FUSE_OPTIONS);
}

/** Returns commands ranked by relevance to `query`; the full list (in order)
 * when the query is empty. */
export function searchCommands(fuse: Fuse<Command>, commands: Command[], query: string): Command[] {
  const q = query.trim();
  if (!q) return commands;
  return fuse.search(q).map((r) => r.item);
}
