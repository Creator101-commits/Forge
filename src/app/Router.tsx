import type { ComponentType } from "react";
import type { WorkspaceId } from "./workspaces";
import { WorkspacePlaceholder } from "./WorkspacePlaceholder";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { SettingsWorkspace } from "@/features/settings/SettingsWorkspace";

/**
 * In-shell workspace router.
 *
 * Each workspace's durable state lives in its Zustand slice (a module-level
 * singleton), so unmounting a workspace when switching away never loses state —
 * remounting reads the same store. Workspaces not yet implemented fall back to
 * a placeholder.
 */
const REGISTRY: Partial<Record<WorkspaceId, ComponentType>> = {
  dashboard: Dashboard,
  settings: SettingsWorkspace,
};

export function Router({ workspace }: { workspace: WorkspaceId }) {
  const Component = REGISTRY[workspace];
  if (Component) return <Component />;
  return <WorkspacePlaceholder workspace={workspace} />;
}
