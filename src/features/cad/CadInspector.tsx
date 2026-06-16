import { useCallback, type ChangeEvent } from "react";
import { useCadStore } from "@/store/cad";
import { PRIMITIVE_DEFS } from "./primitives";

function NumField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1">
      <span className="w-3 text-[10px] text-text-3">{label}</span>
      <input
        type="number"
        value={parseFloat(value.toFixed(3))}
        step={step ?? 0.1}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(parseFloat(e.target.value) || 0)
        }
        className="w-full rounded-1 border border-border-1 bg-bg-0 px-1.5 py-0.5 text-[11px] text-text-1 outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}

export function CadInspector() {
  const objects = useCadStore((s) => s.objects);
  const selectedId = useCadStore((s) => s.selectedId);
  const updateTransform = useCadStore((s) => s.updateTransform);
  const updateProperty = useCadStore((s) => s.updateProperty);

  const selected = objects.find((o) => o.id === selectedId);

  if (!selected) {
    return (
      <aside className="w-56 shrink-0 border-l border-border-1 bg-bg-2 p-3">
        <p className="text-center text-[11px] text-text-3">Nothing selected</p>
      </aside>
    );
  }

  const def = PRIMITIVE_DEFS.find((d) => d.kind === selected.kind);

  const setPosition = useCallback(
    (axis: number, value: number) => {
      const pos: [number, number, number] = [...selected.position];
      pos[axis] = value;
      updateTransform(selected.id, pos);
    },
    [selected.id, selected.position, updateTransform],
  );

  const setRotation = useCallback(
    (axis: number, value: number) => {
      const rot: [number, number, number] = [...selected.rotation];
      rot[axis] = (value * Math.PI) / 180;
      updateTransform(selected.id, undefined, rot);
    },
    [selected.id, selected.rotation, updateTransform],
  );

  const setScale = useCallback(
    (axis: number, value: number) => {
      const s: [number, number, number] = [...selected.scale];
      s[axis] = Math.max(0.01, value);
      updateTransform(selected.id, undefined, undefined, s);
    },
    [selected.id, selected.scale, updateTransform],
  );

  return (
    <aside className="w-56 shrink-0 border-l border-border-1 bg-bg-2 overflow-y-auto">
      <div className="px-3 py-2">
        <input
          type="text"
          value={selected.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateProperty(selected.id, { name: e.target.value })
          }
          className="w-full rounded-1 border border-border-1 bg-bg-0 px-2 py-1 text-xs font-medium text-text-1 outline-none transition-colors focus:border-accent"
        />
        <div className="mt-0.5 text-[10px] text-text-3">
          {def?.label ?? selected.kind}
        </div>
      </div>

      <Section title="Transform">
        <div className="space-y-1">
          <div className="grid grid-cols-3 gap-1">
            <NumField
              label="X"
              value={selected.position[0]}
              onChange={(v) => setPosition(0, v)}
            />
            <NumField
              label="Y"
              value={selected.position[1]}
              onChange={(v) => setPosition(1, v)}
            />
            <NumField
              label="Z"
              value={selected.position[2]}
              onChange={(v) => setPosition(2, v)}
            />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <NumField
              label="RX"
              value={(selected.rotation[0] * 180) / Math.PI}
              onChange={(v) => setRotation(0, v)}
            />
            <NumField
              label="RY"
              value={(selected.rotation[1] * 180) / Math.PI}
              onChange={(v) => setRotation(1, v)}
            />
            <NumField
              label="RZ"
              value={(selected.rotation[2] * 180) / Math.PI}
              onChange={(v) => setRotation(2, v)}
            />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <NumField
              label="SX"
              value={selected.scale[0]}
              step={0.05}
              onChange={(v) => setScale(0, v)}
            />
            <NumField
              label="SY"
              value={selected.scale[1]}
              step={0.05}
              onChange={(v) => setScale(1, v)}
            />
            <NumField
              label="SZ"
              value={selected.scale[2]}
              step={0.05}
              onChange={(v) => setScale(2, v)}
            />
          </div>
        </div>
      </Section>

      <Section title="Material">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={selected.color}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              updateProperty(selected.id, { color: e.target.value })
            }
            className="h-7 w-7 cursor-pointer rounded border border-border-1 bg-transparent"
          />
          <span className="text-[11px] text-text-3 font-mono">
            {selected.color}
          </span>
        </div>
      </Section>
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border-1 px-3 py-2">
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-3">
        {title}
      </div>
      {children}
    </div>
  );
}
