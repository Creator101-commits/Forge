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
import type { DirEntry as GeneratedDirEntry } from "@bindings/DirEntry";
import type { FsChange as GeneratedFsChange } from "@bindings/FsChange";
import type { SearchHit as GeneratedSearchHit } from "@bindings/SearchHit";
import type { SearchOptions as GeneratedSearchOptions } from "@bindings/SearchOptions";
import type { Diagnostic as GeneratedDiagnostic } from "@bindings/Diagnostic";
import type { SerialPortInfo as GeneratedSerialPortInfo } from "@bindings/SerialPortInfo";
import type { SerialConfig as GeneratedSerialConfig } from "@bindings/SerialConfig";
import type { BoardProfile as GeneratedBoardProfile } from "@bindings/BoardProfile";

export type Secret = GeneratedSecret;
export type SecretMeta = GeneratedSecretMeta;
export type Project = GeneratedProject;
export type Settings = GeneratedSettings;
export type RecentProject = GeneratedRecentProject;
export type DirEntry = GeneratedDirEntry;
export type FsChange = GeneratedFsChange;
export type SearchHit = GeneratedSearchHit;
export type SearchOptions = GeneratedSearchOptions;
export type Diagnostic = GeneratedDiagnostic;
export type SerialPortInfo = GeneratedSerialPortInfo;
export type SerialConfig = GeneratedSerialConfig;
export type BoardProfile = GeneratedBoardProfile;

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

/**
 * Subscribe to a backend event. Returns an unlisten function. Outside the
 * desktop shell this is a no-op so the UI degrades gracefully in the browser.
 */
export async function onEvent<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  try {
    const mod = await import("@tauri-apps/api/event");
    return await mod.listen<T>(event, (e) => handler(e.payload));
  } catch {
    return () => {};
  }
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

// ----- M2 filesystem / search / serial / boards -----

export async function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

export async function writeFile(path: string, contents: string): Promise<void> {
  return invoke<void>("write_file", { path, contents });
}

export async function listDir(path: string): Promise<DirEntry[]> {
  return invoke<DirEntry[]>("list_dir", { path });
}

export async function renamePath(from: string, to: string): Promise<void> {
  return invoke<void>("rename_path", { from, to });
}

export async function deletePath(path: string): Promise<void> {
  return invoke<void>("delete_path", { path });
}

export async function watchPath(): Promise<void> {
  return invoke<void>("watch_path");
}

export async function searchProject(options: SearchOptions): Promise<SearchHit[]> {
  return invoke<SearchHit[]>("search_project", { options });
}

export async function listDiagnostics(): Promise<Diagnostic[]> {
  return invoke<Diagnostic[]>("list_diagnostics");
}

export async function pushDiagnostic(diagnostic: Diagnostic): Promise<Diagnostic[]> {
  return invoke<Diagnostic[]>("push_diagnostic", { diagnostic });
}

export async function clearDiagnostics(): Promise<void> {
  return invoke<void>("clear_diagnostics");
}

export async function listSerialPorts(): Promise<SerialPortInfo[]> {
  return invoke<SerialPortInfo[]>("list_serial_ports");
}

export async function connectSerial(config: SerialConfig): Promise<void> {
  return invoke<void>("connect_serial", { config });
}

export async function disconnectSerial(): Promise<void> {
  return invoke<void>("disconnect_serial");
}

export async function sendSerialData(data: string): Promise<void> {
  return invoke<void>("send_serial_data", { data });
}

export async function listBoardProfiles(): Promise<BoardProfile[]> {
  return invoke<BoardProfile[]>("list_board_profiles");
}
