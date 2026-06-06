/**
 * Applies user appearance settings to the document root.
 *
 * Kept dependency-free and DOM-guarded so it can run safely under jsdom in
 * tests and outside the Tauri shell.
 */

import type { Settings } from "@/lib/ipc";

export function applyAppearance(
  settings: Pick<Settings, "theme" | "density" | "reduced_motion">,
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const light = settings.theme === "light";
  root.classList.toggle("light", light);
  root.classList.toggle("dark", !light);

  root.dataset.density = settings.density;
  root.classList.toggle("reduce-motion", settings.reduced_motion);
}
