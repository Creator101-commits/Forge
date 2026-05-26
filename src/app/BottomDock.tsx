import { useState } from "react";
import { clsx } from "clsx";

const TABS = ["AI", "Problems", "Output", "Serial Monitor"] as const;
type Tab = (typeof TABS)[number];

export function BottomDock() {
  const [tab, setTab] = useState<Tab>("AI");
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
          </button>
        ))}
      </div>
      <div className="overflow-auto border-t border-border-1 p-3 text-xs text-text-3">
        {tab === "AI" && <div>AI dock arrives in M3.</div>}
        {tab === "Problems" && <div>No problems detected.</div>}
        {tab === "Output" && <div>Compile output appears here in M9.</div>}
        {tab === "Serial Monitor" && <div>Serial monitor arrives in M2.</div>}
      </div>
    </section>
  );
}
