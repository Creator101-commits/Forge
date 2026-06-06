import { useEffect } from "react";
import { clsx } from "clsx";
import { AlertCircle, AlertTriangle, Info, Lightbulb } from "lucide-react";
import { useDiagnosticsStore } from "@/store/diagnostics";
import { useCodeStore } from "@/store/code";
import type { Diagnostic } from "@/lib/ipc";

const ICONS = {
  error: { Icon: AlertCircle, className: "text-error" },
  warning: { Icon: AlertTriangle, className: "text-warn" },
  info: { Icon: Info, className: "text-text-2" },
  hint: { Icon: Lightbulb, className: "text-text-3" },
} as const;

export function ProblemsPanel() {
  const items = useDiagnosticsStore((s) => s.items);
  const load = useDiagnosticsStore((s) => s.load);
  const openAt = useCodeStore((s) => s.openAt);

  useEffect(() => {
    void load();
    let unsub = () => {};
    void useDiagnosticsStore
      .getState()
      .subscribe()
      .then((fn) => (unsub = fn));
    return () => unsub();
  }, [load]);

  if (items.length === 0) {
    return <div className="p-3 text-xs text-text-3">No problems detected.</div>;
  }

  return (
    <ul data-testid="problems-list" className="flex flex-col p-1 text-xs">
      {items.map((d, i) => (
        <ProblemRow
          key={`${d.file}:${d.range.start_line}:${i}`}
          d={d}
          onOpen={() => void openAt(d.file, d.range.start_line, d.range.start_col)}
        />
      ))}
    </ul>
  );
}

function ProblemRow({ d, onOpen }: { d: Diagnostic; onOpen: () => void }) {
  const { Icon, className } = ICONS[d.severity];
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2 rounded-1 px-2 py-1 text-left hover:bg-surface-1"
      >
        <Icon className={clsx("h-3.5 w-3.5 shrink-0", className)} aria-hidden="true" />
        <span className="truncate text-text-1">{d.message}</span>
        <span className="ml-auto shrink-0 text-text-3">
          {d.file}:{d.range.start_line}:{d.range.start_col}
        </span>
      </button>
    </li>
  );
}
