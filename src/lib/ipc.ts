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

// ----- M3 AI command surface -----

export interface AiProviderInfo {
  id: string;
  name: string;
  capabilities: { supportsStreaming: boolean; supportsSystemPrompt: boolean };
  isConfigured: boolean;
  keyPreview: string | null;
  models: string[];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  temperature: number;
  systemPrompt: string | null;
}

export interface ChatDelta {
  content: string;
}

export interface AiAction {
  kind: "createFile" | "updateFile" | "deleteFile" | "patchRange" | "insertBefore";
  path: string;
  content?: string;
  startLine?: number;
  endLine?: number;
  replacement?: string;
  line?: number;
}

export interface ActionRecord {
  id: string;
  action: AiAction;
  status: "proposed" | "previewed" | "approved" | "applied" | "reverted" | "rejected";
  description: string;
}

export async function aiListProviders(): Promise<AiProviderInfo[]> {
  return invoke<AiProviderInfo[]>("ai_list_providers");
}

export async function aiSetProvider(providerId: string, apiKey: string, baseUrl?: string): Promise<AiProviderInfo> {
  return invoke<AiProviderInfo>("ai_set_provider", { providerId, apiKey, baseUrl });
}

export async function aiTestConnection(providerId: string): Promise<void> {
  return invoke<void>("ai_test_connection", { providerId });
}

export async function aiChat(providerId: string, request: ChatRequest): Promise<void> {
  return invoke<void>("ai_chat", { providerId, request });
}

export async function aiApplyPatch(action: AiAction): Promise<ActionRecord> {
  return invoke<ActionRecord>("ai_apply_patch", { action });
}

export async function aiRevertPatch(actionId: string): Promise<void> {
  return invoke<void>("ai_revert_patch", { actionId });
}

// ----- M4 Circuit command surface -----

export interface CircuitComponent {
  id: string;
  refDes: string;
  value: string;
  symbolId: string;
  footprintId?: string | null;
  x: number;
  y: number;
  rotation: number;
  mirrored: boolean;
  mode: string;
}

export interface CircuitPin {
  id: string;
  componentId: string;
  name: string;
  number: string;
  x: number;
  y: number;
  electricalType: string;
}

export interface CircuitWire {
  id: string;
  netId: string;
  points: [number, number][];
  mode: string;
}

export interface CircuitNet {
  id: string;
  name: string;
  class: string;
}

export interface ErcIssue {
  severity: "Error" | "Warning";
  code: string;
  message: string;
  componentIds: string[];
}

export async function circuitListComponents(): Promise<CircuitComponent[]> {
  return invoke<CircuitComponent[]>("circuit_list_components");
}
export async function circuitAddComponent(comp: CircuitComponent): Promise<CircuitComponent> {
  return invoke<CircuitComponent>("circuit_add_component", { comp });
}
export async function circuitRemoveComponent(id: string): Promise<void> {
  return invoke<void>("circuit_remove_component", { id });
}
export async function circuitUpdateComponent(comp: CircuitComponent): Promise<CircuitComponent> {
  return invoke<CircuitComponent>("circuit_update_component", { comp });
}
export async function circuitListPins(): Promise<CircuitPin[]> {
  return invoke<CircuitPin[]>("circuit_list_pins");
}
export async function circuitAddPin(pin: CircuitPin): Promise<CircuitPin> {
  return invoke<CircuitPin>("circuit_add_pin", { pin });
}
export async function circuitListWires(): Promise<CircuitWire[]> {
  return invoke<CircuitWire[]>("circuit_list_wires");
}
export async function circuitAddWire(wire: CircuitWire): Promise<CircuitWire> {
  return invoke<CircuitWire>("circuit_add_wire", { wire });
}
export async function circuitRemoveWire(id: string): Promise<void> {
  return invoke<void>("circuit_remove_wire", { id });
}
export async function circuitListNets(): Promise<CircuitNet[]> {
  return invoke<CircuitNet[]>("circuit_list_nets");
}
export async function circuitAddNet(net: CircuitNet): Promise<CircuitNet> {
  return invoke<CircuitNet>("circuit_add_net", { net });
}
export async function circuitRunErc(): Promise<ErcIssue[]> {
  return invoke<ErcIssue[]>("circuit_run_erc");
}

// ----- M6 PCB command surface -----

export interface PcbLayer {
  id: string;
  name: string;
  kind: string;
  color: string;
  visible: boolean;
}

export interface PcbFootprint {
  id: string;
  componentRef: string;
  libraryId: string;
  x: number;
  y: number;
  rotation: number;
  side: string;
}

export interface PcbPad {
  id: string;
  footprintId: string;
  name: string;
  netId?: string | null;
  shapeJson: string;
  layerMask: number;
}

export interface PcbTrace {
  id: string;
  netId: string;
  layerId: string;
  pointsJson: string;
  width: number;
}

export interface PcbVia {
  id: string;
  netId: string;
  x: number;
  y: number;
  drill: number;
  diameter: number;
}

export interface PcbZone {
  id: string;
  netId: string;
  layerId: string;
  polygonJson: string;
  clearance: number;
}

export interface DrcIssue {
  severity: "Error" | "Warning";
  code: string;
  message: string;
  position?: [number, number] | null;
}

export async function pcbListLayers(): Promise<PcbLayer[]> { return invoke<PcbLayer[]>("pcb_list_layers"); }
export async function pcbAddLayer(layer: PcbLayer): Promise<PcbLayer> { return invoke<PcbLayer>("pcb_add_layer", { layer }); }
export async function pcbListFootprints(): Promise<PcbFootprint[]> { return invoke<PcbFootprint[]>("pcb_list_footprints"); }
export async function pcbAddFootprint(fp: PcbFootprint): Promise<PcbFootprint> { return invoke<PcbFootprint>("pcb_add_footprint", { fp }); }
export async function pcbRemoveFootprint(id: string): Promise<void> { return invoke<void>("pcb_remove_footprint", { id }); }
export async function pcbListPads(): Promise<PcbPad[]> { return invoke<PcbPad[]>("pcb_list_pads"); }
export async function pcbAddPad(pad: PcbPad): Promise<PcbPad> { return invoke<PcbPad>("pcb_add_pad", { pad }); }
export async function pcbListTraces(): Promise<PcbTrace[]> { return invoke<PcbTrace[]>("pcb_list_traces"); }
export async function pcbAddTrace(trace: PcbTrace): Promise<PcbTrace> { return invoke<PcbTrace>("pcb_add_trace", { trace }); }
export async function pcbRemoveTrace(id: string): Promise<void> { return invoke<void>("pcb_remove_trace", { id }); }
export async function pcbListVias(): Promise<PcbVia[]> { return invoke<PcbVia[]>("pcb_list_vias"); }
export async function pcbAddVia(via: PcbVia): Promise<PcbVia> { return invoke<PcbVia>("pcb_add_via", { via }); }
export async function pcbListZones(): Promise<PcbZone[]> { return invoke<PcbZone[]>("pcb_list_zones"); }
export async function pcbAddZone(zone: PcbZone): Promise<PcbZone> { return invoke<PcbZone>("pcb_add_zone", { zone }); }
export async function pcbRunDrc(): Promise<DrcIssue[]> { return invoke<DrcIssue[]>("pcb_run_drc"); }

// ----- M7 CAD command surface -----

export interface CadObject {
  id: string;
  parentId?: string | null;
  name: string;
  kind: string;
  x: number; y: number; z: number;
  rx: number; ry: number; rz: number;
  sx: number; sy: number; sz: number;
  color: string;
  locked: boolean;
  hidden: boolean;
  metadataJson: string;
}

export interface CadCollision {
  objectA: string;
  objectB: string;
  overlapMm: number;
}

export async function cadListObjects(): Promise<CadObject[]> { return invoke<CadObject[]>("cad_list_objects"); }
export async function cadAddObject(obj: CadObject): Promise<CadObject> { return invoke<CadObject>("cad_add_object", { obj }); }
export async function cadUpdateObject(obj: CadObject): Promise<CadObject> { return invoke<CadObject>("cad_update_object", { obj }); }
export async function cadRemoveObject(id: string): Promise<void> { return invoke<void>("cad_remove_object", { id }); }
export async function cadDetectCollisions(): Promise<CadCollision[]> { return invoke<CadCollision[]>("cad_detect_collisions"); }

// ----- M8 BOM command surface -----

export interface BomItem {
  id: string;
  refDesignators: string[];
  value: string;
  package: string;
  description: string;
  quantity: number;
  unitPrice?: number | null;
  supplier?: string | null;
  supplierPn?: string | null;
  stock?: number | null;
  notes?: string | null;
}

export async function bomGenerate(): Promise<BomItem[]> { return invoke<BomItem[]>("bom_generate"); }
export async function bomUpdateItem(item: BomItem): Promise<BomItem> { return invoke<BomItem>("bom_update_item", { item }); }

// ----- M8 Export command surface -----

export async function exportBomCsv(): Promise<string> { return invoke<string>("export_bom_csv"); }
export async function exportSchematicSvg(): Promise<string> { return invoke<string>("export_schematic_svg"); }

// ----- M9 Compile command surface -----

export interface Toolchain {
  id: string;
  name: string;
  installed: boolean;
  version?: string | null;
}

export async function compileDetectToolchains(): Promise<Toolchain[]> { return invoke<Toolchain[]>("compile_detect_toolchains"); }

export interface CompileResult {
  success: boolean;
  output: string;
  artifactPath?: string | null;
  durationMs: number;
  toolchainMissing: boolean;
}

export interface BoardInfo {
  port: string;
  boardName?: string | null;
  fqbn?: string | null;
}

export async function compileSketch(fqbn: string, sketchDir: string): Promise<CompileResult> {
  return invoke<CompileResult>("compile_sketch", { fqbn, sketchDir });
}
export async function uploadFirmware(fqbn: string, port: string, sketchDir: string): Promise<CompileResult> {
  return invoke<CompileResult>("upload_firmware", { fqbn, port, sketchDir });
}
export async function compileListBoards(): Promise<BoardInfo[]> {
  return invoke<BoardInfo[]>("compile_list_boards");
}
