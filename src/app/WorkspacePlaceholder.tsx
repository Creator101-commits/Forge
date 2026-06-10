import type { WorkspaceId } from "./workspaces";
import { WORKSPACES } from "./workspaces";

const COMING_SOON: Record<WorkspaceId, string> = {
  dashboard: "Recent projects, templates, demo project — wired in M1.",
  cad: "Three.js 3D assembly workspace — wired in M7.",
  circuit: "Schematic / breadboard / block / ladder — schematic ships M4.",
  pcb: "PCB editor with DRC and Gerber export — wired in M6.",
  code: "Monaco editor and serial monitor — wired in M2.",
  bom: "BOM table, sourcing, export — wired in M8.",
  ai: "Pluggable AI dock (OpenAI / Anthropic / Ollama / OpenAI-compatible) — wired in M3.",
  export: "Full export pipeline — wired in M8.",
  compile: "Compile & Upload workspace with board picker, toolchain detection, and serial flashing — wired in M9.",
  settings: "Settings (general/appearance/AI/keys) — wired in M1+M3.",
};

export function WorkspacePlaceholder({ workspace }: { workspace: WorkspaceId }) {
  const def = WORKSPACES.find((w) => w.id === workspace);
  if (!def) return null;
  const Icon = def.icon;
  return (
    <section
      data-testid={`workspace-${workspace}`}
      className="grid h-full w-full place-items-center"
    >
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-3 border border-border-1 bg-surface-1 text-accent">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="font-display text-base text-text-1">{def.label}</h1>
        <p className="text-sm leading-relaxed text-text-3">{COMING_SOON[workspace]}</p>
      </div>
    </section>
  );
}
