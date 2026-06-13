import { useState } from "react";
import { clsx } from "clsx";
import { ProblemsPanel } from "@/features/code/ProblemsPanel";
import { SerialMonitor } from "@/features/code/SerialMonitor";
import { AiDock } from "@/features/ai/AiDock";
import { ErcPanel } from "@/features/circuit/ErcPanel";
import { useDiagnosticsStore } from "@/store/diagnostics";
import { useCircuitStore } from "@/store/circuit";

const TABS = ["AI", "Problems", "ERC", "Output", "Serial Monitor"] as const;
type Tab = (typeof TABS)[number];

export function BottomDock() {
  const [tab, setTab] = useState<Tab>("Problems");
  const problemCount = useDiagnosticsStore((s) => s.items.length);
  const ercCount = useCircuitStore((s) => s.erc.length);
  const bare = tab === "Problems" || tab === "Serial Monitor" || tab === "ERC";
  return (
    <section
      aria-label="Bottom dock"
      data-testid="bottom-dock"
      className="grid h-56 grid-rows-[28px_minmax(0,1fr)] border-t border-border-1 bg-bg-1"
    >
      <div role="tablist" className="flex items-center gap-1 px-2">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={clsx(
              "rounded-1 px-2 py-1 text-xs transition-colors",
              tab === t
                ? "bg-surface-1 text-text-1"
                : "text-text-3 hover:bg-surface-1 hover:text-text-1",
            )}
          >
            {t}
            {t === "Problems" && problemCount > 0 && (
              <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 text-[10px] text-text-2">
                {problemCount}
              </span>
            )}
            {t === "ERC" && ercCount > 0 && (
              <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 text-[10px] text-text-2">
                {ercCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        className={clsx(
          "min-h-0 overflow-auto border-t border-border-1 text-xs text-text-3",
          bare ? "" : "p-3",
        )}
      >
        {tab === "AI" && <AiDock />}
        {tab === "Problems" && <ProblemsPanel />}
        {tab === "ERC" && <ErcPanel />}
        {tab === "Output" && <div>Compile output appears here in M9.</div>}
        {tab === "Serial Monitor" && <SerialMonitor />}
      </div>
    </section>
  );
}
