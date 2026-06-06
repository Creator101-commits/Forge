/**
 * Typed IPC wrapper around Tauri's invoke().
 *
 * Importing `@tauri-apps/api/core` at module top-level breaks Vitest jsdom
 * environments that don't have the Tauri runtime, so we lazy-load it and
 * provide a safe browser fallback that throws a clear error in dev.
 */

import type { Secret as GeneratedSecret } from "@bindings/Secret";
import type { SecretMeta as GeneratedSecretMeta } from "@bindings/SecretMeta";
import type { Project as GeneratedProject } from "@bindings/Project";
import type { Settings as GeneratedSettings } from "@bindings/Settings";
import type { RecentProject as GeneratedRecentProject } from "@bindings/RecentProject";

export type Secret = GeneratedSecret;
export type SecretMeta = GeneratedSecretMeta;
export type Project = GeneratedProject;
export type Settings = GeneratedSettings;
export type RecentProject = GeneratedRecentProject;

let invokeImpl: (<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>) | undefined;

async function getInvoke(): Promise<
  <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
> {
  if (invokeImpl) return invokeImpl;
  try {
    const mod = await import("@tauri-apps/api/core");
    invokeImpl = (cmd, args) => mod.invoke(cmd, args);
    return invokeImpl;
  } catch {
    invokeImpl = async () => {
      throw new Error(
        "Tauri invoke() unavailable in this context (running outside the desktop shell?).",
      );
    };
    return invokeImpl;
  }
}

export async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const fn = await getInvoke();
  return fn<T>(cmd, args);
}

// ----- M0 typed command surface -----

export async function ping(): Promise<string> {
  return invoke<string>("ping");
}

export async function appVersion(): Promise<string> {
  return invoke<string>("app_version");
}

export async function getSecretMeta(secret: Secret): Promise<SecretMeta> {
  return invoke<SecretMeta>("get_secret_meta", { secret });
}

export async function setSecret(secret: Secret, value: string): Promise<SecretMeta> {
  return invoke<SecretMeta>("set_secret", { secret, value });
}

export async function deleteSecret(secret: Secret): Promise<void> {
  return invoke<void>("delete_secret", { secret });
}

// ----- M1 project + settings command surface -----

export async function createProject(path: string, name: string): Promise<Project> {
  return invoke<Project>("create_project", { path, name });
}

export async function openProject(path: string): Promise<Project> {
  return invoke<Project>("open_project", { path });
}

export async function saveProject(project: Project): Promise<Project> {
  return invoke<Project>("save_project", { project });
}

export async function closeProject(): Promise<void> {
  return invoke<void>("close_project");
}

export async function listRecentProjects(): Promise<RecentProject[]> {
  return invoke<RecentProject[]>("list_recent_projects");
}

export async function appendEventLog(kind: string, payload: unknown): Promise<number> {
  return invoke<number>("append_event_log", { kind, payload });
}

export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

export async function setSettings(settings: Settings): Promise<Settings> {
  return invoke<Settings>("set_settings", { settings });
}
