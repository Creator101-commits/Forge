import { useState, useEffect, useCallback } from "react";
import { Upload, Play, RefreshCw, Terminal, Usb, Cpu } from "lucide-react";
import * as ipc from "@/lib/ipc";

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

  const detect = useCallback(async () => {
    setDetecting(true);
    try {
      const [tc, b] = await Promise.all([ipc.compileDetectToolchains(), ipc.compileListBoards()]);
      setToolchains(tc);
      setBoards(b);
      if (b.length > 0 && !port) setPort(b[0]?.port ?? "");
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
    setOutput("Compiling...\n");
    try {
      const result = await ipc.compileSketch(fqbn, sketchDir);
      setOutput(result.output);
      if (result.success) {
        setOutput((p) => p + `\n✓ Compilation succeeded (${result.durationMs}ms)`);
      } else {
        setOutput((p) => p + "\n✗ Compilation failed");
      }
    } catch (e) {
      setOutput((p) => p + `\nError: ${String(e)}`);
    }
    setCompiling(false);
  };

  const handleUpload = async () => {
    if (!fqbn || !port || !sketchDir) return;
    setUploading(true);
    setOutput((p) => p + "\n\nUploading...\n");
    try {
      const result = await ipc.uploadFirmware(fqbn, port, sketchDir);
      setOutput((p) => p + result.output);
      if (result.success) {
        setOutput((p) => p + `\n✓ Upload succeeded (${result.durationMs}ms)`);
      } else {
        setOutput((p) => p + "\n✗ Upload failed");
      }
    } catch (e) {
      setOutput((p) => p + `\nError: ${String(e)}`);
    }
    setUploading(false);
  };

  const busy = compiling || uploading;

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
          <RefreshCw className={detecting ? "animate-spin h-3 w-3" : "h-3 w-3"} />
          Detect
        </button>
      </div>

      {/* Settings panel */}
      <div className="flex flex-wrap gap-3 border-b border-border-1 bg-bg-2 px-3 py-2">
        {/* Board FQBN */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-text-3">Board FQBN</label>
          <input
            type="text"
            value={fqbn}
            onChange={(e) => setFqbn(e.target.value)}
            className="input w-48 py-0.5 text-xs"
            placeholder="arduino:avr:uno"
          />
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
          <input
            type="text"
            value={sketchDir}
            onChange={(e) => setSketchDir(e.target.value)}
            className="input w-56 py-0.5 text-xs"
            placeholder="/path/to/sketch"
          />
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

      {/* Toolchain status */}
      <div className="flex flex-wrap gap-2 border-b border-border-1 px-3 py-1.5">
        {toolchains.map((tc) => (
          <span
            key={tc.id}
            className={`rounded-1 px-2 py-0.5 text-[10px] ${
              tc.installed ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"
            }`}
            title={tc.version ?? undefined}
          >
            {tc.name}: {tc.installed ? "installed" : "not found"}
          </span>
        ))}
      </div>

      {/* Terminal output */}
      <div className="flex-1 overflow-auto bg-[#0a0a0a] p-3">
        {output ? (
          <pre className="font-mono text-[11px] text-green-400 whitespace-pre-wrap break-all">
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
            <RefreshCw className="animate-spin h-3 w-3" />
            {compiling ? "Compiling..." : "Uploading..."}
          </div>
        )}
      </div>
    </section>
  );
}
