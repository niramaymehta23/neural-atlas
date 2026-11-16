import { createModuleStore } from "./module-store";

describe("createModuleStore", () => {
  it("merges updates into plain state and marks the first touch", () => {
    const store = createModuleStore({ step: 0.1, points: [1, 2] });
    expect(store.getState().touched).toBe(false);
    store.update({ step: 0.5 });
    store.update((state) => ({ points: [...state.points, 3] }));
    expect(store.getState()).toEqual({
      state: { step: 0.5, points: [1, 2, 3] },
      touched: true,
      guesses: {},
    });
    expect(JSON.parse(JSON.stringify(store.getState()))).toEqual(store.getState());
  });

  it("will not reveal a prediction before a guess is stored", () => {
    const store = createModuleStore({});
    store.reveal("where", "right");
    expect(store.getState().guesses).toEqual({});
    store.guess("where", "left");
    store.reveal("where", "right");
    expect(store.getState().guesses.where).toEqual({
      choice: "left",
      revealed: true,
      answer: "right",
    });
  });

  it("keeps the guess once revealed", () => {
    const store = createModuleStore({});
    store.guess("where", "left");
    store.reveal("where", "left");
    store.guess("where", "right");
    expect(store.getState().guesses.where?.choice).toBe("left");
  });

  it("restores a whole view", () => {
    const store = createModuleStore({ step: 0.1 });
    const view = {
      state: { step: 0.9 },
      touched: true,
      guesses: { a: { choice: "x", revealed: false } },
    };
    store.restore(view);
    expect(store.getState()).toEqual(view);
  });
});
