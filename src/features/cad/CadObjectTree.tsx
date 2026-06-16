import { clsx } from "clsx";
import {
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Group,
  Ungroup,
  Copy,
  Trash2,
} from "lucide-react";
import { useCadStore, type CadObject } from "@/store/cad";

function TreeNode({
  obj,
  depth,
}: {
  obj: CadObject;
  depth: number;
}) {
  const selectedId = useCadStore((s) => s.selectedId);
  const select = useCadStore((s) => s.select);
  const updateProperty = useCadStore((s) => s.updateProperty);
  const children = useCadStore((s) =>
    s.objects.filter((o) => o.parentId === obj.id),
  );

  return (
    <>
      <div
        className={clsx(
          "group flex cursor-pointer items-center gap-1 rounded-1 px-2 py-0.5 text-xs transition-colors hover:bg-surface-1",
          selectedId === obj.id && "bg-accent/10 text-accent",
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => select(obj.id)}
        role="treeitem"
        aria-selected={selectedId === obj.id}
      >
        <span className="flex-1 truncate">{obj.name}</span>

        <button
          type="button"
          className="rounded p-0.5 text-text-3 opacity-0 transition-opacity hover:text-text-1 group-hover:opacity-100"
          title={obj.hidden ? "Show" : "Hide"}
          onClick={(e) => {
            e.stopPropagation();
            updateProperty(obj.id, { hidden: !obj.hidden });
          }}
        >
          {obj.hidden ? (
            <EyeOff className="h-3 w-3 text-warn" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </button>

        <button
          type="button"
          className="rounded p-0.5 text-text-3 opacity-0 transition-opacity hover:text-text-1 group-hover:opacity-100"
          title={obj.locked ? "Unlock" : "Lock"}
          onClick={(e) => {
            e.stopPropagation();
            updateProperty(obj.id, { locked: !obj.locked });
          }}
        >
          {obj.locked ? (
            <Lock className="h-3 w-3 text-warn" />
          ) : (
            <LockOpen className="h-3 w-3" />
          )}
        </button>
      </div>
      {children.map((child) => (
        <TreeNode key={child.id} obj={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function CadObjectTree() {
  const objects = useCadStore((s) => s.objects);
  const selectedId = useCadStore((s) => s.selectedId);
  const select = useCadStore((s) => s.select);
  const duplicate = useCadStore((s) => s.duplicate);
  const removeObject = useCadStore((s) => s.removeObject);
  const group = useCadStore((s) => s.group);
  const ungroup = useCadStore((s) => s.ungroup);

  const rootObjects = objects.filter((o) => o.parentId === null);
  const selected = objects.find((o) => o.id === selectedId);
  const hasSelection = !!selected;
  const hasParent = selected?.parentId != null;

  function handleGroup() {
    if (!selectedId) return;
    const parentId = selected?.parentId ?? null;
    const siblings = objects
      .filter((o) => o.parentId === parentId)
      .map((o) => o.id);
    if (siblings.length < 2) return;
    group(siblings);
  }

  function handleUngroup() {
    if (!hasParent || !selectedId) return;
    ungroup(selectedId);
  }

  function handleDelete() {
    if (!selectedId) return;
    removeObject(selectedId);
  }

  function handleDuplicate() {
    if (!selectedId) return;
    duplicate(selectedId);
  }

  return (
    <aside className="flex w-48 shrink-0 flex-col border-r border-border-1 bg-bg-2">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-text-3">
          Scene
        </span>
        <span className="text-[10px] text-text-3">{objects.length}</span>
      </div>

      <div
        role="tree"
        className="flex-1 overflow-y-auto px-1"
        onClick={() => select(null)}
      >
        {rootObjects.length === 0 ? (
          <div className="px-2 py-4 text-center text-[11px] text-text-3">
            Empty scene
          </div>
        ) : (
          rootObjects.map((obj) => (
            <TreeNode key={obj.id} obj={obj} depth={0} />
          ))
        )}
      </div>

      <div className="flex items-center gap-0.5 border-t border-border-1 px-2 py-1">
        <button
          type="button"
          className="rounded-1 p-1 text-text-3 transition-colors hover:text-text-1 disabled:opacity-30"
          title="Duplicate"
          disabled={!hasSelection}
          onClick={handleDuplicate}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded-1 p-1 text-text-3 transition-colors hover:text-text-1 disabled:opacity-30"
          title="Group"
          disabled={!hasSelection}
          onClick={handleGroup}
        >
          <Group className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded-1 p-1 text-text-3 transition-colors hover:text-text-1 disabled:opacity-30"
          title="Ungroup"
          disabled={!hasParent}
          onClick={handleUngroup}
        >
          <Ungroup className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          className="rounded-1 p-1 text-text-3 transition-colors hover:text-error disabled:opacity-30"
          title="Remove object"
          disabled={!hasSelection}
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
