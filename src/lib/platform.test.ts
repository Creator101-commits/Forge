import { describe, it, expect, vi, afterEach } from "vitest";
import { isMac, modKeyLabel } from "./platform";

const original = Object.getOwnPropertyDescriptor(navigator, "platform");

function setPlatform(platform: string) {
  Object.defineProperty(navigator, "platform", { value: platform, configurable: true });
}

afterEach(() => {
  if (original) Object.defineProperty(navigator, "platform", original);
  vi.restoreAllMocks();
});

describe("platform helpers", () => {
  it("detects macOS", () => {
    setPlatform("MacIntel");
    expect(isMac()).toBe(true);
    expect(modKeyLabel()).toBe("\u2318");
  });

  it("detects non-macOS", () => {
    setPlatform("Win32");
    expect(isMac()).toBe(false);
    expect(modKeyLabel()).toBe("Ctrl");
  });
});
