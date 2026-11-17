import { createStore, type StoreApi } from "zustand/vanilla";

/** Where persisted stores keep their data: IndexedDB in the browser, memory in tests. */
export type KeyValueStorage = {
  read: (key: string) => Promise<unknown>;
  write: (key: string, value: unknown) => Promise<void>;
};

const DATABASE = "neural-atlas";
const TABLE = "kv";
/** Saved progress never holds a lesson up longer than this; it fills in when it arrives. */
export const READY_TIMEOUT_MS = 2000;

let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(TABLE);
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgrading, or the browser closing the connection: let the next use reopen.
      db.onversionchange = () => {
        db.close();
        database = undefined;
      };
      db.onclose = () => {
        database = undefined;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("The saved-progress database is busy."));
  }).catch((error: unknown) => {
    database = undefined;
    throw error;
  });
  return database;
}

/** One request in its own transaction, settled when the transaction commits (or aborts). */
async function once<T>(mode: IDBTransactionMode, act: (table: IDBObjectStore) => IDBRequest<T>) {
  const transaction = (await openDatabase()).transaction(TABLE, mode);
  return new Promise<T>((resolve, reject) => {
    const request = act(transaction.objectStore(TABLE));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error ?? request.error);
    transaction.onerror = () => reject(transaction.error ?? request.error);
  });
}

/** Retries once on a connection that closed under us (InvalidStateError). */
async function run<T>(mode: IDBTransactionMode, act: (table: IDBObjectStore) => IDBRequest<T>) {
  try {
    return await once(mode, act);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "InvalidStateError")) throw error;
    database = undefined;
    return once(mode, act);
  }
}

/** Whether this browser keeps what is saved: false where IndexedDB is missing or refused. */
export const storageHealth = createStore<{ persistent: boolean }>(() => ({ persistent: true }));
const failed = () => storageHealth.setState({ persistent: false });

/** IndexedDB, or nothing at all where it is missing (the server, some private windows). */
export const browserStorage: KeyValueStorage = {
  read: async (key) => {
    if (typeof indexedDB === "undefined") return failed();
    return run("readonly", (table) => table.get(key)).catch(failed);
  },
  write: async (key, value) => {
    if (typeof indexedDB === "undefined") return failed();
    await run("readwrite", (table) => table.put(value, key)).catch(failed);
  },
};

/** Forgets the open connection, so the next use reopens it (tests simulate restarts with it). */
export function resetDatabaseForTests(): void {
  database = undefined;
}

export type PersistedStore<T> = StoreApi<T> & {
  /** Settles once the saved value has been read, or after `READY_TIMEOUT_MS` at most. */
  ready: Promise<void>;
  /**
   * Applies a change and saves it. It waits for hydration (so an early change is never
   * overwritten) and applies to the freshly saved value, so another tab's changes are kept.
   * One failed change never stops later ones.
   */
  change: (next: (value: T) => T) => Promise<void>;
};

const timeout = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * A store whose plain-data value survives reloads. `parse` vets what was saved, salvaging what
 * it can, and returns null for anything it does not recognise at all. Such a value is copied
 * aside to `<key>-corrupt-<time>` before being overwritten, so nothing is lost for good.
 */
export function createPersistedStore<T>(
  key: string,
  initial: T,
  parse: (saved: unknown) => T | null,
  storage: KeyValueStorage,
): PersistedStore<T> {
  const store = createStore<T>(() => initial);
  const load = async () => {
    const saved = await storage.read(key);
    const value = parse(saved);
    if (value === null && saved !== undefined && saved !== null) {
      await storage.write(`${key}-corrupt-${Date.now()}`, saved);
    }
    return value ?? store.getState();
  };
  const hydrated = load().then(
    (value) => store.setState(value, true),
    () => undefined,
  );
  const ready = Promise.race([hydrated, timeout(READY_TIMEOUT_MS)]);
  let saving = hydrated;
  return {
    ...store,
    ready,
    change: (next) => {
      const change = saving
        .catch(() => undefined)
        .then(async () => {
          const value = next(await load());
          store.setState(value, true);
          await storage.write(key, value);
        });
      saving = change;
      return change;
    },
  };
}
