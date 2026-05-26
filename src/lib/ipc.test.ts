import { describe, it, expectTypeOf } from "vitest";
import type { Secret, SecretMeta } from "./ipc";

describe("generated bindings", () => {
  it("Secret has service/key strings", () => {
    expectTypeOf<Secret>().toMatchTypeOf<{ service: string; key: string }>();
  });

  it("SecretMeta has set boolean and optional preview", () => {
    expectTypeOf<SecretMeta>().toMatchTypeOf<{
      service: string;
      key: string;
      set: boolean;
    }>();
  });
});
