import { describe, it, expect, afterEach } from "vitest";
import { formatHotkey, matchesHotkey, PALETTE_HOTKEY } from "./hotkeys";

function setPlatform(platform: string) {
  Object.defineProperty(navigator, "platform", { value: platform, configurable: true });
}

afterEach(() => {
  setPlatform("");
});

describe("formatHotkey", () => {
  it("renders the macOS command glyph", () => {
    setPlatform("MacIntel");
    expect(formatHotkey(PALETTE_HOTKEY)).toMatchInlineSnapshot(`"⌘K"`);
    expect(formatHotkey({ mod: true, shift: true, key: "p" })).toMatchInlineSnapshot(`"⌘⇧P"`);
  });

  it("renders Ctrl on non-macOS platforms", () => {
    setPlatform("Win32");
    expect(formatHotkey(PALETTE_HOTKEY)).toMatchInlineSnapshot(`"Ctrl+K"`);
    expect(formatHotkey({ mod: true, shift: true, key: "p" })).toMatchInlineSnapshot(
      `"Ctrl+Shift+P"`,
    );
  });

  it("keeps multi-character key names verbatim", () => {
    setPlatform("Win32");
    expect(formatHotkey({ key: "Enter" })).toBe("Enter");
  });
});

describe("matchesHotkey", () => {
  it("matches meta+k on macOS", () => {
    setPlatform("MacIntel");
    const e = new KeyboardEvent("keydown", { key: "k", metaKey: true });
    expect(matchesHotkey(e, PALETTE_HOTKEY)).toBe(true);
    const wrong = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
    expect(matchesHotkey(wrong, PALETTE_HOTKEY)).toBe(false);
  });

  it("matches ctrl+k on Windows/Linux", () => {
    setPlatform("Win32");
    const e = new KeyboardEvent("keydown", { key: "K", ctrlKey: true });
    expect(matchesHotkey(e, PALETTE_HOTKEY)).toBe(true);
  });
});
