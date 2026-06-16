import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import {
  Upload,
  Play,
  RefreshCw,
  Terminal,
  Usb,
  Cpu,
  AlertTriangle,
  XCircle,
  CheckCircle,
  X,
  ExternalLink,
  Bot,
} from "lucide-react";
import * as ipc from "@/lib/ipc";
import { useAiStore } from "@/store/ai";

type UploadPhase = "idle" | "building" | "resetting" | "flashing" | "verifying";

const UPLOAD_PHASES: UploadPhase[] = ["building", "resetting", "flashing", "verifying"];

const PHASE_LABELS: Record<UploadPhase, string> = {
  idle: "",
  building: "Building sketch...",
  resetting: "Resetting device...",
  flashing: "Flashing firmware...",
  verifying: "Verifying...",
};

function errorSeverity(code: string): "warn" | "error" {
  return code === "invalid_argument" || code === "not_found" ? "warn" : "error";
}

function getInstallCommand(tc: ipc.Toolchain): string {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);
  const isLinux =
    typeof navigator !== "undefined" && /Linux/i.test(navigator.platform);

  switch (tc.id) {
    case "arduino-cli":
      return isMac
        ? "brew install arduino-cli"
        : isLinux
          ? "curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh"
          : "winget install Arduino.ArduinoCLI";
    case "avr-gcc":
      return isMac
        ? "brew install avr-gcc"
        : isLinux
          ? "sudo apt-get install gcc-avr avr-libc"
          : "Download from https://blog.zakkemble.net/avr-gcc-builds/";
    default:
      return `See ${tc.name} documentation for install instructions`;
  }
}

function getDocLink(tc: ipc.Toolchain): string {
  switch (tc.id) {
    case "arduino-cli":
      return "https://arduino.github.io/arduino-cli/installation/";
    case "avr-gcc":
      return "https://avr-gcc.sourceforge.net/";
    default:
      return "";
  }
}

export function CompileWorkspace() {
  const [toolchains, setToolchains] = useState<ipc.Toolchain[]>([]);
  const [boards, setBoards] = useState<ipc.BoardInfo[]>([]);
  const [fqbn, setFqbn] = useState("arduino:avr:uno");
  const [port, setPort] = useState("");
  const [sketchDir, setSketchDir] = useState("");
  const [output, setOutput] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [sketchValid, setSketchValid] = useState<boolean | null>(null);
  const [fqbnOptions, setFqbnOptions] = useState<string[]>([]);
  const [compileError, setCompileError] = useState<{ code: string; message: string } | null>(
    null,
  );
  const [outputDismissed, setOutputDismissed] = useState(false);

  // Set up streaming event listeners (mount once)
  useEffect(() => {
    const unlisteners: (() => void)[] = [];
    let cancelled = false;
    const safeOn = <T,>(event: string, handler: (p: T) => void) => {
      ipc.onEvent<T>(event, handler).then((fn) => {
        if (cancelled) { fn(); } else { unlisteners.push(fn); }
      });
    };

    safeOn<{ line: string }>("compile://log", (payload) => {
      setOutput((prev) => prev + (payload.line ?? ""));
    });
    safeOn<{ phase: string }>("compile://phase", (payload) => {
      setUploadPhase(payload.phase as UploadPhase);
    });

    return () => {
      cancelled = true;
      unlisteners.forEach((fn) => fn());
    };
  }, []);

  // Validate sketch path on change (debounced)
  useEffect(() => {
    if (!sketchDir.trim()) {
      setSketchValid(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const entries = await ipc.listDir(sketchDir);
        setSketchValid(entries.some((e) => e.name.endsWith(".ino")));
      } catch {
        setSketchValid(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [sketchDir]);

  const detect = useCallback(async () => {
    setDetecting(true);
    try {
      const [tc, b] = await Promise.all([
        ipc.compileDetectToolchains(),
        ipc.compileListBoards(),
      ]);
      setToolchains(tc);
      setBoards(b);
      if (b.length > 0 && !port) setPort(b[0]?.port ?? "");

      const fqbns = b
        .map((x) => x.fqbn)
        .filter((f): f is string => f !== null && f !== undefined);
      const unique = [...new Set(fqbns)];
      setFqbnOptions(unique);
      if (unique.length > 0) setFqbn(unique[0] ?? "");
    } catch {
      setToolchains([]);
      setBoards([]);
    }
    setDetecting(false);
  }, [port]);

  useEffect(() => {
    void detect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompile = async () => {
    if (!fqbn || !sketchDir) return;
    setCompiling(true);
    setCompileError(null);
    setOutputDismissed(false);
    setOutput((prev) => prev + "\n── Compiling ──\n");
    try {
      const result = await ipc.compileSketch(fqbn, sketchDir);
      setOutput((prev) => prev + result.output);
      if (result.success) {
        setOutput((prev) => prev + `\n✓ Compilation succeeded (${result.durationMs}ms)`);
      } else {
        const msg = result.toolchainMissing
          ? "Toolchain not found. Install the required toolchain and try again."
          : "Compilation failed";
        setOutput((prev) => prev + `\n✗ ${msg}`);
        if (!result.toolchainMissing) {
          setCompileError({ code: "compile_failed", message: msg });
        }
      }
    } catch (err: unknown) {
      const fe = ipc.parseForgeError(err);
      setOutput((prev) => prev + `\n✗ ${fe.message}`);
      setCompileError(fe);
    }
    setCompiling(false);
  };

  const handleUpload = async () => {
    if (!fqbn || !port || !sketchDir) return;
    setUploading(true);
    setCompileError(null);
    setOutputDismissed(false);
    setUploadPhase("building");
    setOutput((prev) => prev + "\n── Upload ──\n");
    try {
      const result = await ipc.uploadFirmware(fqbn, port, sketchDir);
      setOutput((prev) => prev + result.output);
      setUploadPhase("idle");
      if (result.success) {
        setOutput((prev) => prev + `\n✓ Upload succeeded (${result.durationMs}ms)`);
      } else {
        setOutput((prev) => prev + "\n✗ Upload failed");
        setCompileError({ code: "upload_failed", message: "Upload failed. Check connections." });
      }
    } catch (err: unknown) {
      const fe = ipc.parseForgeError(err);
      setOutput((prev) => prev + `\n✗ ${fe.message}`);
      setCompileError(fe);
      setUploadPhase("idle");
    }
    setUploading(false);
  };

  const busy = compiling || uploading;
  const missingToolchains = toolchains.filter((tc) => !tc.installed);
  const hasOutput = output.trim().length > 0 && !outputDismissed;

  return (
    <section data-testid="workspace-compile" className="flex h-full flex-col bg-bg-1">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border-1 px-3 py-1.5">
        <Cpu className="h-4 w-4 text-accent" />
        <span className="text-xs font-medium text-text-1">Compile &amp; Upload</span>
        <div className="flex-1" />
        <button
          onClick={detect}
          disabled={detecting}
          className="btn-secondary flex items-center gap-1 px-2 py-0.5 text-xs"
          title="Refresh toolchains and boards"
        >
          <RefreshCw className={clsx(detecting ? "animate-spin" : "", "h-3 w-3")} />
          Detect
        </button>
      </div>

      {/* Settings panel */}
      <div className="flex flex-wrap gap-3 border-b border-border-1 bg-bg-2 px-3 py-2">
        {/* Board FQBN */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-text-3">Board FQBN</label>
          {fqbnOptions.length > 0 ? (
            <select
              value={fqbn}
              onChange={(e) => setFqbn(e.target.value)}
              className="input w-48 py-0.5 text-xs"
            >
              {fqbnOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={fqbn}
              onChange={(e) => setFqbn(e.target.value)}
              className="input w-48 py-0.5 text-xs"
              placeholder="arduino:avr:uno"
            />
          )}
        </div>

        {/* Port */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-text-3">Serial Port</label>
          <div className="flex items-center gap-1">
            <Usb className="h-3 w-3 text-text-3" />
            <select
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="input w-40 py-0.5 text-xs"
            >
              <option value="">Auto-detect</option>
              {boards.map((b) => (
                <option key={b.port} value={b.port}>
                  {b.port} {b.boardName ? `(${b.boardName})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sketch directory */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-text-3">Sketch Path</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={sketchDir}
              onChange={(e) => setSketchDir(e.target.value)}
              className={clsx(
                "input w-56 py-0.5 text-xs",
                sketchValid === true && "border-ok/50",
                sketchValid === false && "border-error/50",
              )}
              placeholder="/path/to/sketch"
            />
            {sketchValid === true && <CheckCircle className="h-3 w-3 shrink-0 text-ok" />}
            {sketchValid === false && <XCircle className="h-3 w-3 shrink-0 text-error" />}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-end gap-1">
          <button
            onClick={handleCompile}
            disabled={busy || !fqbn || !sketchDir}
            className="btn-accent flex items-center gap-1 px-3 py-1 text-xs"
          >
            <Play className="h-3 w-3" />
            Compile
          </button>
          <button
            onClick={handleUpload}
            disabled={busy || !fqbn || !port || !sketchDir}
            className="btn-accent flex items-center gap-1 px-3 py-1 text-xs"
          >
            <Upload className="h-3 w-3" />
            Upload
          </button>
        </div>
      </div>

      {/* Missing toolchain guidance */}
      {missingToolchains.length > 0 && (
        <div className="border-b border-warn/30 bg-warn/5 px-3 py-2">
          <div className="mb-1 flex items-center gap-1 text-xs text-warn">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-medium">Missing toolchains</span>
          </div>
          <div className="flex flex-col gap-2">
            {missingToolchains.map((tc) => (
              <div key={tc.id} className="rounded-1 border border-border-1 bg-bg-2 px-3 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-text-1">{tc.name}</span>
                  <span className="rounded-1 bg-warn/15 px-1.5 py-0.5 text-[10px] text-warn">
                    not installed
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="rounded-1 bg-bg-1 px-1.5 py-0.5 text-[11px] text-text-2">
                    {getInstallCommand(tc)}
                  </code>
                  {getDocLink(tc) && (
                    <a
                      href={getDocLink(tc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-3 hover:text-accent"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolchain status (installed) */}
      {toolchains.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-border-1 px-3 py-1.5">
          {toolchains.map((tc) => (
            <span
              key={tc.id}
              className={clsx(
                "rounded-1 px-2 py-0.5 text-[10px]",
                tc.installed ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn",
              )}
              title={tc.version ?? undefined}
            >
              {tc.name}: {tc.installed ? "installed" : "not found"}
            </span>
          ))}
        </div>
      )}

      {/* Upload phase progress */}
      {uploading && (
        <div className="flex items-center gap-2 border-b border-border-1 bg-bg-2 px-3 py-1.5">
          {UPLOAD_PHASES.map((phase) => {
            const phaseIdx = UPLOAD_PHASES.indexOf(phase);
            const currentIdx = UPLOAD_PHASES.indexOf(uploadPhase);
            const active = uploadPhase === phase;
            const done = phaseIdx < currentIdx;
            return (
              <div key={phase} className="flex items-center gap-1 text-[11px]">
                <span
                  className={clsx(
                    "flex h-3 w-3 shrink-0 items-center justify-center rounded-full",
                    done && "bg-ok",
                    active && "animate-pulse bg-accent",
                    !done && !active && "bg-border-1",
                  )}
                >
                  {done && <CheckCircle className="h-2 w-2 text-[#04211d]" />}
                </span>
                <span
                  className={clsx(
                    done && "text-ok",
                    active && "text-accent",
                    !done && !active && "text-text-3",
                  )}
                >
                  {PHASE_LABELS[phase]}
                </span>
                {phase !== "verifying" && <span className="mx-1 text-text-3">→</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Terminal output */}
      <div className="flex-1 overflow-auto bg-[#0a0a0a] p-3">
        {hasOutput ? (
          <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-green-400">
            {output}
          </pre>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-text-3">
              <Terminal className="h-8 w-8 opacity-20" />
              <p className="text-xs">Compile output will appear here</p>
              <p className="text-[11px]">
                Select a board FQBN and sketch path, then click Compile or Upload.
              </p>
            </div>
          </div>
        )}
        {(compiling || uploading) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-text-2">
            <RefreshCw className="h-3 w-3 animate-spin" />
            {compiling
              ? "Compiling..."
              : uploadPhase !== "idle"
                ? PHASE_LABELS[uploadPhase]
                : "Uploading..."}
          </div>
        )}
      </div>

      {/* Error bar */}
      {compileError && !busy && (
        <div
          className={clsx(
            "flex items-start gap-2 border-t px-3 py-2 text-xs",
            errorSeverity(compileError.code) === "warn"
              ? "border-warn/30 bg-warn/5 text-warn"
              : "border-error/30 bg-error/5 text-error",
          )}
        >
          {errorSeverity(compileError.code) === "warn" ? (
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <div className="flex-1">
            <span className="font-medium">{compileError.code.replace(/_/g, " ")}: </span>
            {compileError.message}
          </div>
          <button
            onClick={() => {
              if (!compileError) return;
              const aiState = useAiStore.getState();
              aiState.clearChat();
              useAiStore.setState({
                messages: [{
                  role: "user",
                  content: `Fix this compilation error: ${compileError.code}: ${compileError.message}\n\nThe sketch is at: ${sketchDir}`,
                }],
              });
            }}
            className="shrink-0 p-0.5 hover:opacity-70"
            title="Send error to AI assistant"
          >
            <Bot className="h-3 w-3" />
          </button>
          <button
            onClick={() => setCompileError(null)}
            className="shrink-0 p-0.5 hover:opacity-70"
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Dismiss output */}
      {hasOutput && !busy && (
        <div className="flex items-center justify-end border-t border-border-1 px-3 py-1">
          <button
            onClick={() => setOutputDismissed(true)}
            className="btn-ghost flex items-center gap-1 text-[11px] text-text-3"
          >
            <X className="h-3 w-3" /> Dismiss
          </button>
        </div>
      )}
    </section>
  );
}
