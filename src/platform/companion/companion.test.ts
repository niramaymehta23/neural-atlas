import { memoryStorage } from "../storage.mock";
import { createCompanionStore, freshCompanion } from "./companion";

describe("companion model", () => {
  it("keeps its upgrades across a reload", async () => {
    const storage = memoryStorage();
    const first = createCompanionStore(storage);
    await first.update({ hidden: [4, 6] });
    await first.update({ activation: "relu" });

    const reloaded = createCompanionStore(storage);
    await reloaded.ready;
    expect(reloaded.getState()).toEqual({ hidden: [4, 6], activation: "relu", convolution: false });

    await reloaded.reset();
    expect(createCompanionStore(storage).getState()).toEqual(freshCompanion);
  });

  it("starts fresh from unrecognised saved data", async () => {
    for (const saved of [
      { hidden: [0], activation: "tanh", convolution: false },
      { hidden: [4], activation: "swish", convolution: false },
    ]) {
      const store = createCompanionStore(memoryStorage(new Map([["companion-v1", saved]])));
      await store.ready;
      expect(store.getState()).toEqual(freshCompanion);
    }
  });
});
