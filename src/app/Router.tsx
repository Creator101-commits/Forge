import { lazy, Suspense, type ComponentType } from "react";
import type { WorkspaceId } from "./workspaces";
import { WorkspacePlaceholder } from "./WorkspacePlaceholder";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/**
 * In-shell workspace router with code-splitting via React.lazy.
 *
 * Each workspace is lazily loaded to keep the initial bundle small.
 * A Suspense + LoadingSpinner is shown while loading, and an
 * ErrorBoundary catches any render crashes.
 *
 * All lazy() calls are at module top-level (React requirement).
 */

const LazyDashboard = lazy(() => import("@/features/dashboard/Dashboard").then((m) => ({ default: m.Dashboard })));
const LazyCad = lazy(() => import("@/features/cad/CadWorkspace").then((m) => ({ default: m.CadWorkspace })));
const LazyCircuit = lazy(() => import("@/features/circuit/CircuitWorkspace").then((m) => ({ default: m.CircuitWorkspace })));
const LazyPcb = lazy(() => import("@/features/pcb/PcbWorkspace").then((m) => ({ default: m.PcbWorkspace })));
const LazyCode = lazy(() => import("@/features/code/CodeWorkspace").then((m) => ({ default: m.CodeWorkspace })));
const LazyBom = lazy(() => import("@/features/bom/BomWorkspace").then((m) => ({ default: m.BomWorkspace })));
const LazyAi = lazy(() => import("@/features/ai/AiWorkspace").then((m) => ({ default: m.AiWorkspace })));
const LazyExport = lazy(() => import("@/features/export/ExportWorkspace").then((m) => ({ default: m.ExportWorkspace })));
const LazyCompile = lazy(() => import("@/features/compile/CompileWorkspace").then((m) => ({ default: m.CompileWorkspace })));
const LazySettings = lazy(() => import("@/features/settings/SettingsWorkspace").then((m) => ({ default: m.SettingsWorkspace })));

const COMPONENTS: Partial<Record<WorkspaceId, ComponentType>> = {
  dashboard: LazyDashboard,
  cad: LazyCad,
  circuit: LazyCircuit,
  pcb: LazyPcb,
  code: LazyCode,
  bom: LazyBom,
  ai: LazyAi,
  export: LazyExport,
  compile: LazyCompile,
  settings: LazySettings,
};

export function Router({ workspace }: { workspace: WorkspaceId }) {
  const Component = COMPONENTS[workspace];
  if (!Component) return <WorkspacePlaceholder workspace={workspace} />;

  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center bg-bg-1">
            <LoadingSpinner size="md" label={`Loading ${workspace}...`} />
          </div>
        }
      >
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}
