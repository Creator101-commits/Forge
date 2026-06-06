import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
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
