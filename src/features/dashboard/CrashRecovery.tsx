import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEventLogStore } from "@/store/eventLog";

export function CrashRecovery() {
  const hasOrphanedLog = useEventLogStore((s) => s.hasOrphanedLog);
  const markRecovered = useEventLogStore((s) => s.markRecovered);
  const clearOrphanedLog = useEventLogStore((s) => s.clearOrphanedLog);

  if (!hasOrphanedLog) return null;

  return (
    <Dialog.Root defaultOpen>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] w-[min(400px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-3 border border-border-1 bg-surface-1 p-5 shadow-2">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warn/15">
              <AlertTriangle className="h-4 w-4 text-warn" />
            </div>
            <div className="min-w-0">
              <Dialog.Title className="font-display text-base text-text-1">
                Unexpected Shutdown
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-relaxed text-text-2">
                We detected an unexpected shutdown from your last session. Would you like
                to restore your work?
              </Dialog.Description>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={clearOrphanedLog}
              className="btn-ghost flex items-center gap-1.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Start Fresh
            </button>
            <button
              type="button"
              onClick={markRecovered}
              autoFocus
              className="btn-accent flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Restore
            </button>
          </div>

          <p className="mt-3 text-[11px] text-text-3">
            Restore reopens your previous project and unsaved changes. Start Fresh
            discards the recovery data.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
