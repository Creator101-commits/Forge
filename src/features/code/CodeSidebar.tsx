import { useState } from "react";
import { clsx } from "clsx";
import { FolderTree, Search } from "lucide-react";
import { FileTree } from "./FileTree";
import { SearchPanel } from "./SearchPanel";

type Pane = "explorer" | "search";

export function CodeSidebar() {
  const [pane, setPane] = useState<Pane>("explorer");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Code sidebar"
        className="flex items-center gap-1 border-b border-border-1 px-2 py-1"
      >
        <SidebarTab
          active={pane === "explorer"}
          onClick={() => setPane("explorer")}
          label="Explorer"
          Icon={FolderTree}
        />
        <SidebarTab
          active={pane === "search"}
          onClick={() => setPane("search")}
          label="Search"
          Icon={Search}
        />
      </div>
      <div className="min-h-0 flex-1">{pane === "explorer" ? <FileTree /> : <SearchPanel />}</div>
    </div>
  );
}

function SidebarTab({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: typeof Search;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 rounded-1 px-2 py-1 text-xs transition-colors",
        active ? "bg-surface-1 text-text-1" : "text-text-3 hover:text-text-1",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
