/**
 * Cross-platform helpers. Kept dependency-free so tests can stub easily.
 * We avoid the Tauri OS plugin here to keep the renderer testable without IPC.
 */

export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const p =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    "";
  return /Mac|iPhone|iPad/i.test(p);
}

export function modKeyLabel(): string {
  return isMac() ? "\u2318" : "Ctrl";
}
