import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Plug, Unplug, RefreshCw, Trash2, ArrowDownToLine } from "lucide-react";
import { useSerialStore } from "@/store/serial";

const BAUDS = [9600, 19200, 38400, 57600, 115200, 230400, 250000];

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export function SerialMonitor() {
  const {
    ports,
    status,
    port,
    baud,
    lines,
    refreshPorts,
    setPort,
    setBaud,
    connect,
    disconnect,
    send,
    clear,
  } = useSerialStore();
  const [input, setInput] = useState("");
  const [autoscroll, setAutoscroll] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void refreshPorts();
    let unsub = () => {};
    void useSerialStore
      .getState()
      .subscribe()
      .then((fn) => (unsub = fn));
    return () => unsub();
  }, [refreshPorts]);

  useEffect(() => {
    if (autoscroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines, autoscroll]);

  const connected = status === "connected";

  const sendLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || !connected) return;
    await send(`${input}\n`);
    setInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-1 px-2 py-1.5">
        <select
          aria-label="Serial port"
          value={port ?? ""}
          onChange={(e) => setPort(e.target.value)}
          disabled={connected}
          className="rounded-1 border border-border-1 bg-bg-2 px-2 py-1 text-xs text-text-1"
        >
          {ports.length === 0 && <option value="">No ports</option>}
          {ports.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Baud rate"
          value={baud}
          onChange={(e) => setBaud(Number(e.target.value))}
          disabled={connected}
          className="rounded-1 border border-border-1 bg-bg-2 px-2 py-1 text-xs text-text-1"
        >
          {BAUDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <button
          type="button"
          aria-label="Refresh ports"
          onClick={() => void refreshPorts()}
          disabled={connected}
          className="rounded-1 p-1 text-text-3 hover:bg-surface-1 hover:text-text-1 disabled:opacity-40"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {connected ? (
          <button
            type="button"
            onClick={() => void disconnect()}
            className="flex items-center gap-1.5 rounded-1 border border-border-1 px-2 py-1 text-xs text-text-1 hover:bg-surface-1"
          >
            <Unplug className="h-3.5 w-3.5" aria-hidden="true" /> Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={() => port && void connect(port, baud)}
            disabled={!port || status === "connecting"}
            className="flex items-center gap-1.5 rounded-1 bg-accent px-2 py-1 text-xs text-[#04211d] disabled:opacity-40"
          >
            <Plug className="h-3.5 w-3.5" aria-hidden="true" />
            {status === "connecting" ? "Connecting…" : "Connect"}
          </button>
        )}

        <span
          data-testid="serial-status"
          className={clsx(
            "ml-1 text-[11px]",
            connected ? "text-ok" : status === "error" ? "text-error" : "text-text-3",
          )}
        >
          {status}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-pressed={autoscroll}
            aria-label="Autoscroll"
            onClick={() => setAutoscroll((v) => !v)}
            className={clsx(
              "rounded-1 p-1 hover:bg-surface-1",
              autoscroll ? "text-accent" : "text-text-3",
            )}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Clear monitor"
            onClick={clear}
            className="rounded-1 p-1 text-text-3 hover:bg-surface-1 hover:text-text-1"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={logRef}
        data-testid="serial-log"
        className="min-h-0 flex-1 overflow-auto p-2 font-mono text-xs text-text-2"
      >
        {lines.length === 0 ? (
          <div className="text-text-3">No data received.</div>
        ) : (
          lines.map((line) => (
            <div key={line.id} className="flex gap-2">
              <span className="shrink-0 text-text-3">{fmtTime(line.ts)}</span>
              <span className="whitespace-pre-wrap break-all text-text-1">{line.text}</span>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={sendLine}
        className="flex items-center gap-2 border-t border-border-1 px-2 py-1.5"
      >
        <input
          aria-label="Send to serial"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!connected}
          placeholder={connected ? "Type a line and press Enter…" : "Connect to send"}
          className="w-full rounded-1 border border-border-1 bg-bg-2 px-2 py-1 text-xs text-text-1 outline-none placeholder:text-text-3 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !input}
          className="rounded-1 bg-accent px-3 py-1 text-xs text-[#04211d] disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
