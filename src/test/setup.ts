import "@testing-library/jest-dom/vitest";
import { afterEach, vi, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { createElement, useEffect } from "react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Monaco can't run under jsdom (it loads a worker/loader). Replace it with a
// lightweight textarea that preserves the props EditorPane relies on.
vi.mock("@monaco-editor/react", () => {
  interface EditorProps {
    value?: string;
    path?: string;
    onChange?: (value: string | undefined) => void;
    onMount?: (editor: unknown, monaco: unknown) => void;
  }
  const Editor = ({ value, path, onChange, onMount }: EditorProps) => {
    useEffect(() => {
      onMount?.(
        {
          revealLineInCenter: () => {},
          setPosition: () => {},
          focus: () => {},
          addCommand: () => {},
          getValue: () => value ?? "",
        },
        { KeyMod: { CtrlCmd: 1 }, KeyCode: { KeyS: 1 } },
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return createElement("textarea", {
      "data-testid": "monaco-editor",
      "aria-label": `editor:${path ?? ""}`,
      value: value ?? "",
      onChange: (e: { target: { value: string } }) => onChange?.(e.target.value),
    });
  };
  return { default: Editor };
});

// jsdom lacks these APIs used by cmdk / Radix; stub them no-op.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
if (!("ResizeObserver" in window)) {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Ensure localStorage is available (jsdom may not expose it globally).
let storage: Record<string, string> = {};
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => { storage[k] = v; },
    removeItem: (k: string) => { delete storage[k]; },
    clear: () => { storage = {}; },
    get length() { return Object.keys(storage).length; },
    key: (i: number) => Object.keys(storage)[i] ?? null,
  },
  configurable: true,
  writable: true,
});
beforeEach(() => { storage = {}; });

// R3F / drei can't create WebGL contexts under jsdom. Global mock so any
// test rendering a tree with R3F components (e.g. CadWorkspace) doesn't crash.
vi.mock("@react-three/fiber", () => {
  const stub = new Proxy(
    { Canvas: ({ children }: { children: React.ReactNode }) => children },
    { get: (target, prop) => (prop in target ? target[prop as keyof typeof target] : () => null) },
  );
  return { ...stub };
});
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  TransformControls: () => null,
  Text: () => null,
  Html: () => null,
  useGLTF: () => ({ scene: null }),
  useAnimations: () => ({}),
}));

// Stable platform default for tests; individual tests can override navigator.
if (!("matchMedia" in window)) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
