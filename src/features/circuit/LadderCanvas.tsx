import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Plus, Trash2 } from "lucide-react";
import {
  useLadderStore,
  evaluateRung,
  ELEMENT_LABELS,
  type ElementKind,
  type LadderElement,
  type Rung,
} from "@/store/ladder";

const KINDS: ElementKind[] = ["no", "nc", "coil", "timer"];

/** Ladder-logic editor (M5): rungs of contacts feeding coils, with simulation. */
export function LadderCanvas() {
  const rungs = useLadderStore((s) => s.rungs);
  const [sim, setSim] = useState<Record<string, boolean>>({});

  // Collect contact variables so they can be toggled in the simulator.
  const vars = useMemo(() => {
    const set = new Set<string>();
    for (const r of rungs) for (const e of r.elements) if (e.kind === "no" || e.kind === "nc") set.add(e.label);
    return [...set];
  }, [rungs]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border-1 bg-bg-2 px-2 py-1">
        <button
          onClick={() => useLadderStore.getState().addRung()}
          className="flex items-center gap-1 rounded-1 border border-border-1 px-1.5 py-0.5 text-[11px] text-text-2 hover:text-text-1"
        >
          <Plus className="h-3 w-3" /> Rung
        </button>
        <div className="h-4 w-px bg-border-1" />
        <span className="text-[10px] uppercase tracking-wider text-text-3">Inputs</span>
        {vars.length === 0 && <span className="text-[11px] text-text-3">— add contacts —</span>}
        {vars.map((v) => (
          <button
            key={v}
            onClick={() => setSim((s) => ({ ...s, [v]: !s[v] }))}
            className={clsx(
              "rounded-1 px-1.5 py-0.5 text-[11px]",
              sim[v] ? "bg-ok/20 text-ok" : "bg-surface-1 text-text-3",
            )}
          >
            {v}={sim[v] ? "1" : "0"}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-bg-1 p-3">
        {rungs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-text-3">
            Add a rung, then add contacts and a coil.
          </div>
        ) : (
          <div className="space-y-3">
            {rungs.map((r, i) => (
              <RungRow key={r.id} rung={r} index={i} sim={sim} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RungRow({
  rung,
  index,
  sim,
}: {
  rung: Rung;
  index: number;
  sim: Record<string, boolean>;
}) {
  const { energized } = evaluateRung(rung.elements, sim);
  return (
    <div data-testid={`rung-${rung.id}`} className="flex items-center gap-2">
      <span className="w-6 text-right text-[10px] text-text-3">{index + 1}</span>
      <div
        className={clsx(
          "flex flex-1 items-center gap-1 rounded-1 border px-2 py-2",
          energized ? "border-ok/60 bg-ok/5" : "border-border-1",
        )}
      >
        <span className={clsx("h-3 w-1 rounded", energized ? "bg-ok" : "bg-border-2")} />
        {rung.elements.map((e) => (
          <ElementChip key={e.id} rungId={rung.id} el={e} sim={sim} />
        ))}
        {KINDS.map((k) => (
          <button
            key={k}
            title={`Add ${ELEMENT_LABELS[k]}`}
            onClick={() => useLadderStore.getState().addElement(rung.id, k)}
            className="rounded-1 border border-dashed border-border-2 px-1 py-0.5 text-[10px] text-text-3 hover:text-text-1"
          >
            +{k.toUpperCase()}
          </button>
        ))}
        <div className="flex-1" />
        <span className={clsx("h-3 w-1 rounded", energized ? "bg-ok" : "bg-border-2")} />
        <button
          onClick={() => useLadderStore.getState().removeRung(rung.id)}
          className="text-text-3 hover:text-error"
          title="Delete rung"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function ElementChip({
  rungId,
  el,
  sim,
}: {
  rungId: string;
  el: LadderElement;
  sim: Record<string, boolean>;
}) {
  const active =
    (el.kind === "no" && sim[el.label]) || (el.kind === "nc" && !sim[el.label]);
  return (
    <span
      className={clsx(
        "flex items-center gap-1 rounded-1 border px-1.5 py-1 text-[10px]",
        el.kind === "coil" || el.kind === "timer"
          ? "border-accent/50 text-accent"
          : active
            ? "border-ok/60 text-ok"
            : "border-border-2 text-text-2",
      )}
    >
      <span className="font-mono">{symbolFor(el.kind)}</span>
      <input
        aria-label={`label for ${el.id}`}
        value={el.label}
        onChange={(ev) => useLadderStore.getState().setLabel(rungId, el.id, ev.target.value)}
        className="w-12 bg-transparent text-text-1 outline-none"
      />
      <button
        onClick={() => useLadderStore.getState().removeElement(rungId, el.id)}
        className="text-text-3 hover:text-error"
        aria-label={`remove ${el.id}`}
      >
        ×
      </button>
    </span>
  );
}

function symbolFor(kind: ElementKind): string {
  switch (kind) {
    case "no":
      return "] [";
    case "nc":
      return "]/[";
    case "coil":
      return "( )";
    case "timer":
      return "(T)";
  }
}
