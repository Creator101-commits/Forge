import { useState, Fragment } from "react";
import { clsx } from "clsx";
import {
  MousePointer2,
  Move,
  RotateCcw,
  Plus,
  Trash2,
  Maximize,
  Grid3X3,
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { useCadStore, type TransformMode, type CadView } from "@/store/cad";
import { PRIMITIVE_DEFS, createGeometry } from "./primitives";
import { CadObjectTree } from "./CadObjectTree";
import { CadInspector } from "./CadInspector";

const VIEWS = ["Perspective", "Top", "Front", "Right"];

function SceneContent() {
  const objects = useCadStore((s) => s.objects);
  const selectedId = useCadStore((s) => s.selectedId);
  const transformMode = useCadStore((s) => s.transformMode);
  const select = useCadStore((s) => s.select);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <gridHelper args={[20, 20]} />
      <axesHelper args={[5]} />
      <OrbitControls makeDefault />

      {objects
        .filter((o) => !o.hidden)
        .map((obj) => {
          const isSelected = obj.id === selectedId;
          const showGizmo = isSelected && transformMode !== "select";

          const mesh = (
            <mesh
              geometry={createGeometry(obj.kind)}
              position={obj.position}
              rotation={obj.rotation}
              scale={obj.scale}
              onClick={(e) => {
                e.stopPropagation();
                select(obj.id);
              }}
            >
              <meshStandardMaterial color={obj.color} />
            </mesh>
          );

          if (showGizmo) {
            return (
              <TransformControls key={obj.id} mode={transformMode}>
                {mesh}
              </TransformControls>
            );
          }
          return <Fragment key={obj.id}>{mesh}</Fragment>;
        })}
    </>
  );
}

export function CadWorkspace() {
  const objects = useCadStore((s) => s.objects);
  const selectedId = useCadStore((s) => s.selectedId);
  const transformMode = useCadStore((s) => s.transformMode);
  const view = useCadStore((s) => s.view);
  const snapEnabled = useCadStore((s) => s.snapEnabled);
  const setTransformMode = useCadStore((s) => s.setTransformMode);
  const setView = useCadStore((s) => s.setView);
  const toggleSnap = useCadStore((s) => s.toggleSnap);
  const addObject = useCadStore((s) => s.addObject);
  const removeObject = useCadStore((s) => s.removeObject);

  const [showPrimitiveMenu, setShowPrimitiveMenu] = useState(false);

  const tools: { mode: TransformMode; icon: typeof MousePointer2; label: string }[] = [
    { mode: "select", icon: MousePointer2, label: "Select" },
    { mode: "translate", icon: Move, label: "Move" },
    { mode: "rotate", icon: RotateCcw, label: "Rotate" },
    { mode: "scale", icon: Maximize, label: "Scale" },
  ];

  const viewLabel = view.charAt(0).toUpperCase() + view.slice(1);

  return (
    <section data-testid="workspace-cad" className="flex h-full flex-col bg-bg-1">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border-1 px-2 py-1">
        {tools.map((t) => (
          <button
            key={t.mode}
            className={clsx(
              "rounded-1 p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-accent",
              transformMode === t.mode
                ? "bg-accent/15 text-accent"
                : "text-text-3 hover:text-text-1",
            )}
            title={t.label}
            onClick={() => setTransformMode(t.mode)}
          >
            <t.icon className="h-3.5 w-3.5" />
          </button>
        ))}

        <div className="relative">
          <button
            className={clsx(
              "rounded-1 p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-accent",
              showPrimitiveMenu
                ? "bg-accent/15 text-accent"
                : "text-text-3 hover:text-text-1",
            )}
            title="Add primitive"
            onClick={() => setShowPrimitiveMenu((p) => !p)}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {showPrimitiveMenu && (
            <div className="absolute left-0 top-full z-50 mt-1 w-36 rounded-1 border border-border-1 bg-bg-2 py-1 shadow-lg">
              {PRIMITIVE_DEFS.map((def) => (
                <button
                  key={def.kind}
                  className="flex w-full items-center gap-2 px-3 py-1 text-xs text-text-2 hover:bg-surface-1 hover:text-text-1"
                  onClick={() => {
                    addObject(def.kind);
                    setShowPrimitiveMenu(false);
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: def.defaultColor }}
                  />
                  {def.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="rounded-1 p-1.5 text-text-3 transition-colors hover:text-text-1 focus-visible:ring-2 focus-visible:ring-accent"
          title="Delete"
          onClick={() => selectedId && removeObject(selectedId)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 h-5 w-px bg-border-1" />

        <button
          className={clsx(
            "rounded-1 p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-accent",
            snapEnabled ? "text-accent" : "text-text-3 hover:text-text-1",
          )}
          title="Toggle grid"
          onClick={() => toggleSnap()}
        >
          <Grid3X3 className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1" />

        <div role="group" className="flex rounded-1 border border-border-1 bg-bg-2 p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v.toLowerCase() as CadView)}
              className={clsx(
                "rounded-1 px-2 py-0.5 text-[11px] focus-visible:ring-2 focus-visible:ring-accent",
                view === v.toLowerCase()
                  ? "bg-accent text-[#04211d]"
                  : "text-text-3 hover:text-text-1",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <CadObjectTree />

        <div className="flex-1 overflow-hidden bg-bg-0">
          <Canvas camera={{ position: [5, 5, 5], fov: 50 }} dpr={[1, 2]}>
            <SceneContent />
          </Canvas>
        </div>

        <CadInspector />
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 border-t border-border-1 px-3 py-1 text-[11px] text-text-3">
        <span>View: {viewLabel}</span>
        <span>Objects: {objects.length}</span>
        <span>Units: mm</span>
        <span>Snap: {snapEnabled ? "on" : "off"}</span>
        {transformMode !== "select" && <span>Gizmo: {transformMode}</span>}
      </div>
    </section>
  );
}
