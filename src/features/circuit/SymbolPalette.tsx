import { clsx } from "clsx";
import { useCircuitStore } from "@/store/circuit";
import { SYMBOLS, type SymbolDef } from "./symbols";

const CATEGORIES = ["Passive", "Active", "Power", "Connector", "IO"] as const;

/** Symbol library palette for the circuit workspace sidebar. */
export function SymbolPalette() {
  const armPlace = useCircuitStore((s) => s.armPlace);
  const placingSymbolId = useCircuitStore((s) => s.placingSymbolId);
  const tool = useCircuitStore((s) => s.tool);

  return (
    <div data-testid="symbol-palette" className="flex h-full flex-col">
      <div className="border-b border-border-1 px-3 py-2 text-xs uppercase tracking-wider text-text-3">
        Symbols
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {CATEGORIES.map((cat) => {
          const items = SYMBOLS.filter((s) => s.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} className="mb-3">
              <div className="mb-1 px-1 text-[10px] uppercase tracking-wider text-text-3">
                {cat}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {items.map((sym) => (
                  <PaletteItem
                    key={sym.id}
                    sym={sym}
                    active={tool === "place" && placingSymbolId === sym.id}
                    onPick={() => armPlace(sym.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaletteItem({
  sym,
  active,
  onPick,
}: {
  sym: SymbolDef;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      title={`Place ${sym.name}`}
      aria-pressed={active}
      onClick={onPick}
      className={clsx(
        "flex flex-col items-center gap-1 rounded-1 border p-1.5 text-[10px] transition-colors",
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border-1 text-text-2 hover:border-border-2 hover:text-text-1",
      )}
    >
      <svg viewBox="-40 -40 80 80" className="h-8 w-12">
        <g className={active ? "text-accent" : "text-text-1"}>{sym.body}</g>
      </svg>
      <span className="truncate">{sym.name}</span>
    </button>
  );
}
