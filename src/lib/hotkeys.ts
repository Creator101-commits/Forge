/**
 * Global hotkey system with OS-aware labels.
 *
 * A hotkey is described declaratively as a set of modifiers + a key. Labels
 * render with platform glyphs (⌘/⌥/⌃/⇧ on macOS, Ctrl/Alt/Shift elsewhere).
 */

import { useEffect } from "react";
import { isMac } from "./platform";

export interface Hotkey {
  /** Requires the platform "command" modifier: ⌘ on macOS, Ctrl elsewhere. */
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Single key, compared case-insensitively (e.g. "k", "Enter"). */
  key: string;
}

const MAC_GLYPHS = {
  mod: "\u2318", // ⌘
  shift: "\u21e7", // ⇧
  alt: "\u2325", // ⌥
} as const;

/** Human-readable label for a hotkey, OS-aware. */
export function formatHotkey(hk: Hotkey): string {
  const mac = isMac();
  const parts: string[] = [];
  if (hk.mod) parts.push(mac ? MAC_GLYPHS.mod : "Ctrl");
  if (hk.alt) parts.push(mac ? MAC_GLYPHS.alt : "Alt");
  if (hk.shift) parts.push(mac ? MAC_GLYPHS.shift : "Shift");
  parts.push(hk.key.length === 1 ? hk.key.toUpperCase() : hk.key);
  return mac ? parts.join("") : parts.join("+");
}

/** True when a keyboard event matches the hotkey for the current platform. */
export function matchesHotkey(e: KeyboardEvent, hk: Hotkey): boolean {
  const wantMod = !!hk.mod;
  const gotMod = isMac() ? e.metaKey : e.ctrlKey;
  if (wantMod !== gotMod) return false;
  if (!!hk.shift !== e.shiftKey) return false;
  if (!!hk.alt !== e.altKey) return false;
  return e.key.toLowerCase() === hk.key.toLowerCase();
}

export interface HotkeyBinding {
  hotkey: Hotkey;
  handler: (e: KeyboardEvent) => void;
  /** When false, the binding does not preventDefault. Defaults to true. */
  preventDefault?: boolean;
}

/** Registers a list of global hotkey bindings on `window` for the component's
 * lifetime. */
export function useGlobalHotkeys(bindings: HotkeyBinding[]): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      for (const b of bindings) {
        if (matchesHotkey(e, b.hotkey)) {
          if (b.preventDefault !== false) e.preventDefault();
          b.handler(e);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindings]);
}

/** The canonical "open command palette" hotkey. */
export const PALETTE_HOTKEY: Hotkey = { mod: true, key: "k" };
