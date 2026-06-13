import { RotateCw, FlipHorizontal2, Trash2 } from "lucide-react";
import { useCircuitStore } from "@/store/circuit";
import { getSymbol } from "./symbols";

/** Inspector for the selected schematic component. */
export function CircuitInspector() {
  const selectedId = useCircuitStore((s) => s.selectedId);
  const comp = useCircuitStore((s) => s.components.find((c) => c.id === s.selectedId) ?? null);
  const setValue = useCircuitStore((s) => s.setValue);
  const rotate = useCircuitStore((s) => s.rotateComponent);
  const mirror = useCircuitStore((s) => s.mirrorComponent);
  const remove = useCircuitStore((s) => s.removeComponent);

  if (!comp || !selectedId) {
    return <div className="text-[11px] text-text-3">No component selected.</div>;
  }
  const sym = getSymbol(comp.symbolId);

  return (
    <div data-testid="circuit-inspector" className="space-y-3 text-[11px]">
      <Field label="Reference">
        <span className="font-medium text-text-1">{comp.refDes}</span>
      </Field>
      <Field label="Symbol">
        <span className="text-text-2">{sym?.name ?? comp.symbolId}</span>
      </Field>
      <label className="block">
        <div className="mb-1 text-text-3">Value</div>
        <input
          aria-label="Component value"
          value={comp.value}
          onChange={(e) => setValue(comp.id, e.target.value)}
          className="w-full rounded-1 border border-border-1 bg-bg-2 px-2 py-1 text-text-1 outline-none focus:border-accent"
        />
      </label>
      <Field label="Position">
        <span className="text-text-2">
          {comp.x}, {comp.y} · {comp.rotation}°{comp.mirrored ? " · mirrored" : ""}
        </span>
      </Field>
      <div className="flex gap-1 pt-1">
        <Action icon={RotateCw} label="Rotate" onClick={() => rotate(comp.id)} />
        <Action icon={FlipHorizontal2} label="Mirror" onClick={() => mirror(comp.id)} />
        <Action icon={Trash2} label="Delete" danger onClick={() => remove(comp.id)} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-3">{label}</span>
      {children}
    </div>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof RotateCw;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 rounded-1 border border-border-1 py-1 hover:border-border-2 ${
        danger ? "text-error hover:bg-error/10" : "text-text-2 hover:text-text-1"
      }`}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}
