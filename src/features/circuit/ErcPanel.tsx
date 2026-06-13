import { clsx } from "clsx";
import { AlertTriangle, XCircle, CheckCircle2, Play } from "lucide-react";
import { useCircuitStore } from "@/store/circuit";

/** ERC results panel (bottom dock). Click an issue to select its component. */
export function ErcPanel() {
  const erc = useCircuitStore((s) => s.erc);
  const runErc = useCircuitStore((s) => s.runErc);
  const select = useCircuitStore((s) => s.select);

  const errors = erc.filter((i) => i.severity === "Error").length;
  const warnings = erc.filter((i) => i.severity === "Warning").length;

  return (
    <div data-testid="erc-panel" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border-1 px-3 py-1.5">
        <button
          type="button"
          onClick={() => runErc()}
          className="flex items-center gap-1 rounded-1 bg-surface-1 px-2 py-0.5 text-[11px] text-text-1 hover:bg-surface-2"
        >
          <Play className="h-3 w-3" /> Run ERC
        </button>
        <span className="text-[11px] text-text-3">
          {errors} error{errors !== 1 ? "s" : ""}, {warnings} warning
          {warnings !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {erc.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-ok">
            <CheckCircle2 className="h-3.5 w-3.5" /> No ERC issues — run ERC to re-check.
          </div>
        ) : (
          <ul>
            {erc.map((issue, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => issue.componentIds[0] && select(issue.componentIds[0])}
                  className="flex w-full items-start gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-surface-1"
                >
                  {issue.severity === "Error" ? (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
                  )}
                  <span className="flex-1 text-text-2">{issue.message}</span>
                  <span
                    className={clsx(
                      "shrink-0 rounded-full px-1.5 text-[9px]",
                      issue.severity === "Error"
                        ? "bg-error/15 text-error"
                        : "bg-warn/15 text-warn",
                    )}
                  >
                    {issue.code}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
