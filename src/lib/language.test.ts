import { describe, it, expect } from "vitest";
import { languageForPath } from "./language";

describe("languageForPath", () => {
  const cases: [string, string][] = [
    ["sketch.ino", "cpp"],
    ["main.cpp", "cpp"],
    ["driver.c", "c"],
    ["pins.h", "cpp"],
    ["script.py", "python"],
    ["lib.rs", "rust"],
    ["config.json", "json"],
    ["ci.yaml", "yaml"],
    ["Cargo.toml", "toml"],
    ["README.md", "markdown"],
  ];

  it.each(cases)("maps %s -> %s", (path, expected) => {
    expect(languageForPath(path)).toBe(expected);
  });

  it("handles nested paths and unknown extensions", () => {
    expect(languageForPath("code/sketch/main.ino")).toBe("cpp");
    expect(languageForPath("data.bin")).toBe("plaintext");
    expect(languageForPath("Makefile")).toBe("plaintext");
  });
});
