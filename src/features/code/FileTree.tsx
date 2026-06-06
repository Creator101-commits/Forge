import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as ipc from "@/lib/ipc";
import type { DirEntry } from "@/lib/ipc";
import { useCodeStore } from "@/store/code";

interface FlatNode {
  entry: DirEntry;
  depth: number;
}

const ROW_HEIGHT = 24;

export function FileTree() {
  const openFile = useCodeStore((s) => s.openFile);
  const activePath = useCodeStore((s) => s.activePath);
  const [childrenByPath, setChildrenByPath] = useState<Record<string, DirEntry[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([""]));
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadDir = useCallback(async (path: string) => {
    try {
      const entries = await ipc.listDir(path);
      setChildrenByPath((prev) => ({ ...prev, [path]: entries }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Initial root load.
  useEffect(() => {
    void loadDir("");
  }, [loadDir]);

  // Refresh all currently-loaded directories on any filesystem change.
  useEffect(() => {
    let unsub = () => {};
    void (async () => {
      unsub = await ipc.onEvent<ipc.FsChange>("fs://change", () => {
        setChildrenByPath((prev) => {
          for (const dir of Object.keys(prev)) void loadDir(dir);
          return prev;
        });
      });
    })();
    return () => unsub();
  }, [loadDir]);

  const toggle = useCallback(
    (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          if (!childrenByPath[path]) void loadDir(path);
        }
        return next;
      });
    },
    [childrenByPath, loadDir],
  );

  const flat = useMemo(() => {
    const out: FlatNode[] = [];
    const walk = (dir: string, depth: number) => {
      const entries = childrenByPath[dir] ?? [];
      for (const entry of entries) {
        out.push({ entry, depth });
        if (entry.is_dir && expanded.has(entry.path)) walk(entry.path, depth + 1);
      }
    };
    walk("", 0);
    return out;
  }, [childrenByPath, expanded]);

  const virtualizer = useVirtualizer({
    count: flat.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    initialRect: { width: 240, height: 600 },
  });

  // In environments where the scroll element reports a zero-size rect (e.g.
  // jsdom under tests), the virtualizer yields no window — fall back to
  // rendering every row so content is still present and testable.
  const virtualItems = virtualizer.getVirtualItems();
  const rows =
    virtualItems.length > 0 || flat.length === 0
      ? virtualItems.map((vi) => ({ index: vi.index, start: vi.start }))
      : flat.map((_, index) => ({ index, start: index * ROW_HEIGHT }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 py-2 text-xs uppercase tracking-wider text-text-3">Explorer</div>
      {error && (
        <div role="alert" className="px-3 py-2 text-xs text-text-3">
          {error}
        </div>
      )}
      <div ref={scrollRef} data-testid="file-tree" className="min-h-0 flex-1 overflow-auto">
        {flat.length === 0 && !error && (
          <div className="px-3 py-2 text-xs text-text-3">No files.</div>
        )}
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {rows.map((row) => {
            const node = flat[row.index];
            if (!node) return null;
            const { entry, depth } = node;
            const isExpanded = entry.is_dir && expanded.has(entry.path);
            const isActive = entry.path === activePath;
            return (
              <div
                key={entry.path}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${ROW_HEIGHT}px`,
                  transform: `translateY(${row.start}px)`,
                }}
              >
                <button
                  type="button"
                  onClick={() => (entry.is_dir ? toggle(entry.path) : void openFile(entry.path))}
                  style={{ paddingLeft: `${8 + depth * 12}px` }}
                  className={clsx(
                    "flex h-full w-full items-center gap-1.5 pr-2 text-left text-[13px]",
                    isActive ? "bg-accent-soft text-text-1" : "text-text-2 hover:bg-surface-1",
                  )}
                >
                  {entry.is_dir ? (
                    <>
                      {isExpanded ? (
                        <ChevronDown
                          className="h-3.5 w-3.5 shrink-0 text-text-3"
                          aria-hidden="true"
                        />
                      ) : (
                        <ChevronRight
                          className="h-3.5 w-3.5 shrink-0 text-text-3"
                          aria-hidden="true"
                        />
                      )}
                      {isExpanded ? (
                        <FolderOpen
                          className="h-3.5 w-3.5 shrink-0 text-accent"
                          aria-hidden="true"
                        />
                      ) : (
                        <Folder className="h-3.5 w-3.5 shrink-0 text-text-3" aria-hidden="true" />
                      )}
                    </>
                  ) : (
                    <File
                      className="ml-[14px] h-3.5 w-3.5 shrink-0 text-text-3"
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate">{entry.name}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
