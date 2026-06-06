import { clsx } from "clsx";
import { useUiStore } from "@/store/ui";
import { useProjectStore } from "@/store/project";
import { useSerialStore } from "@/store/serial";

const SERIAL_LABEL: Record<string, string> = {
  disconnected: "Serial: idle",
  connecting: "Serial: connecting…",
  connected: "Serial: connected",
  error: "Serial: error",
};

export function StatusBar() {
  const active = useUiStore((s) => s.activeWorkspace);
  const project = useProjectStore((s) => s.current);
  const dirty = useProjectStore((s) => s.dirty);
  const serialStatus = useSerialStore((s) => s.status);
  const serialPort = useSerialStore((s) => s.port);
  return (
    <footer
      data-testid="status-bar"
      className="flex h-6 items-center justify-between border-t border-border-1 bg-bg-1 px-3 text-[11px] text-text-3"
    >
      <div className="flex items-center gap-3">
        <span data-testid="status-workspace">{active}</span>
        <span aria-hidden="true">•</span>
        <span data-testid="status-project">
          {project ? `${project.name}${dirty ? " •" : ""}` : "No project"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          data-testid="status-serial"
          className={clsx(
            serialStatus === "connected" && "text-ok",
            serialStatus === "connecting" && "text-warn",
            serialStatus === "error" && "text-error",
          )}
        >
          {SERIAL_LABEL[serialStatus] ?? "Serial: idle"}
          {serialStatus === "connected" && serialPort ? ` (${serialPort})` : ""}
        </span>
        <span aria-hidden="true">•</span>
        <span>v0.3.0</span>
        <span aria-hidden="true">•</span>
        <span>AI: not configured</span>
      </div>
    </footer>
  );
}
