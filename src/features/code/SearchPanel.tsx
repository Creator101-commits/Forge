import { useState } from "react";
import { Search } from "lucide-react";
import * as ipc from "@/lib/ipc";
import type { SearchHit } from "@/lib/ipc";
import { useCodeStore } from "@/store/code";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const openAt = useCodeStore((s) => s.openAt);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    try {
      const results = await ipc.searchProject({
        query,
        case_sensitive: false,
        is_regex: false,
        max_results: 500,
      });
      setHits(results);
      setSearched(true);
    } catch {
      setHits([]);
      setSearched(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 py-2 text-xs uppercase tracking-wider text-text-3">Search</div>
      <form onSubmit={run} className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-2 border border-border-1 bg-bg-2 px-2">
          <Search className="h-3.5 w-3.5 text-text-3" aria-hidden="true" />
          <input
            aria-label="Search project"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find in project…"
            className="w-full bg-transparent py-1.5 text-xs text-text-1 outline-none placeholder:text-text-3"
          />
        </div>
      </form>
      <div className="min-h-0 flex-1 overflow-auto px-1">
        {busy && <div className="px-2 py-1 text-xs text-text-3">Searching…</div>}
        {!busy && searched && hits.length === 0 && (
          <div data-testid="search-empty" className="px-2 py-1 text-xs text-text-3">
            No results.
          </div>
        )}
        <ul data-testid="search-results">
          {hits.map((h, i) => (
            <li key={`${h.path}:${h.line}:${i}`}>
              <button
                type="button"
                onClick={() => void openAt(h.path, h.line, h.column)}
                className="flex w-full flex-col gap-0.5 rounded-1 px-2 py-1 text-left hover:bg-surface-1"
              >
                <span className="truncate text-[11px] text-text-3">
                  {h.path}:{h.line}
                </span>
                <span className="truncate font-mono text-xs text-text-1">{h.line_text.trim()}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
