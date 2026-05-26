/**
 * Typed IPC wrapper around Tauri's invoke().
 *
 * Importing `@tauri-apps/api/core` at module top-level breaks Vitest jsdom
 * environments that don't have the Tauri runtime, so we lazy-load it and
 * provide a safe browser fallback that throws a clear error in dev.
 */

import type { Secret as GeneratedSecret } from "@bindings/Secret";
import type { SecretMeta as GeneratedSecretMeta } from "@bindings/SecretMeta";

export type Secret = GeneratedSecret;
export type SecretMeta = GeneratedSecretMeta;

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
