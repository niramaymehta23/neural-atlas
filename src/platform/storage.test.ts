import { IDBFactory } from "fake-indexeddb";
import "fake-indexeddb/auto";
import { browserStorage, resetDatabaseForTests, storageHealth } from "./storage";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDatabaseForTests();
  storageHealth.setState({ persistent: true });
});

/** Deletes the database from elsewhere (another tab clearing data): a version change for us. */
const deleteElsewhere = () =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("neural-atlas");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("blocked: the open connection did not close"));
  });

describe("browserStorage (PLT-21, PLT-27, NAV-24)", () => {
  it("reads back what it wrote once the transaction commits", async () => {
    await browserStorage.write("k", { a: 1 });
    expect(await browserStorage.read("k")).toEqual({ a: 1 });
  });

  it("closes on a version change and reopens for the next write", async () => {
    await browserStorage.write("k", 1);
    await deleteElsewhere();
    await browserStorage.write("k", 2);
    expect(await browserStorage.read("k")).toBe(2);
    expect(storageHealth.getState().persistent).toBe(true);
  });

  it("says progress will not be kept when IndexedDB is missing", async () => {
    const saved = globalThis.indexedDB;
    // @ts-expect-error -- simulating a browser without IndexedDB
    delete globalThis.indexedDB;
    await browserStorage.write("k", 1);
    expect(storageHealth.getState().persistent).toBe(false);
    globalThis.indexedDB = saved;
  });
});
