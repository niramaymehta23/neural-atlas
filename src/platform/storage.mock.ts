import type { KeyValueStorage } from "./storage";

/** A storage that lives in memory, for tests; `saved` shows what was written. */
export function memoryStorage(saved = new Map<string, unknown>()): KeyValueStorage & {
  saved: Map<string, unknown>;
} {
  return {
    saved,
    read: async (key) => structuredClone(saved.get(key)),
    write: async (key, value) => void saved.set(key, structuredClone(value)),
  };
}
