import { createStore, type StoreApi } from "zustand/vanilla";

/** Where persisted stores keep their data: IndexedDB in the browser, memory in tests. */
export type KeyValueStorage = {
  read: (key: string) => Promise<unknown>;
  write: (key: string, value: unknown) => Promise<void>;
};

const DATABASE = "neural-atlas";
const TABLE = "kv";

let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(TABLE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}

async function run<T>(mode: IDBTransactionMode, act: (table: IDBObjectStore) => IDBRequest<T>) {
  const table = (await openDatabase()).transaction(TABLE, mode).objectStore(TABLE);
  return new Promise<T>((resolve, reject) => {
    const request = act(table);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** IndexedDB, or nothing at all where it is missing (the server, some private windows). */
export const browserStorage: KeyValueStorage = {
  read: async (key) =>
    typeof indexedDB === "undefined"
      ? undefined
      : run("readonly", (table) => table.get(key)).catch(() => undefined),
  write: async (key, value) => {
    if (typeof indexedDB === "undefined") return;
    await run("readwrite", (table) => table.put(value, key)).catch(() => undefined);
  },
};

export type PersistedStore<T> = StoreApi<T> & {
  /** Settles once the saved value has been read. */
  ready: Promise<void>;
  /**
   * Applies a change and saves it. It waits for hydration (so an early change is never
   * overwritten) and applies to the freshly saved value, so another tab's changes are kept.
   */
  change: (next: (value: T) => T) => Promise<void>;
};

/**
 * A store whose plain-data value survives reloads. `parse` vets what was saved and returns null
 * for anything it does not recognise, which leaves the current value in place.
 */
export function createPersistedStore<T>(
  key: string,
  initial: T,
  parse: (saved: unknown) => T | null,
  storage: KeyValueStorage,
): PersistedStore<T> {
  const store = createStore<T>(() => initial);
  const load = async () => parse(await storage.read(key)) ?? store.getState();
  const ready = load().then((value) => store.setState(value, true));
  let saving = ready;
  return {
    ...store,
    ready,
    change: (next) => {
      saving = saving.then(async () => {
        const value = next(await load());
        store.setState(value, true);
        await storage.write(key, value);
      });
      return saving;
    },
  };
}
