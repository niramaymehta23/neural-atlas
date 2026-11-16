import { createStore, type StoreApi } from "zustand/vanilla";
import type { ModuleState, Update } from "./contract";

/** A learner's pick for one prediction; once revealed it is locked, beside what really happened. */
export type Guess = { choice: string; revealed: boolean; answer?: string };

/** Everything a lesson's view depends on: plain data, so it is also the snapshot's body. */
export type ModuleView<S extends ModuleState = ModuleState> = {
  state: S;
  /** True after the first interaction; the story caption waits for it. */
  touched: boolean;
  guesses: Record<string, Guess>;
};

export type ModuleStore<S extends ModuleState = ModuleState> = StoreApi<ModuleView<S>> & {
  update: Update<S>;
  /** Stores a guess; ignored once that prediction is revealed. */
  guess: (id: string, choice: string) => void;
  /** Reveals a prediction with what really happened; ignored until a guess is stored. */
  reveal: (id: string, answer: string) => void;
  restore: (view: ModuleView<S>) => void;
};

/** One store per lesson instance, holding its state and the learner's guesses. */
export function createModuleStore<S extends ModuleState>(initialState: S): ModuleStore<S> {
  const store = createStore<ModuleView<S>>(() => ({
    state: initialState,
    touched: false,
    guesses: {},
  }));
  const { getState, setState } = store;
  return {
    ...store,
    update: (change) => {
      const { state } = getState();
      const next = typeof change === "function" ? change(state) : change;
      setState({ state: { ...state, ...next }, touched: true });
    },
    guess: (id, choice) => {
      const { guesses } = getState();
      if (guesses[id]?.revealed) return;
      setState({ guesses: { ...guesses, [id]: { choice, revealed: false } }, touched: true });
    },
    reveal: (id, answer) => {
      const { guesses } = getState();
      const guess = guesses[id];
      if (!guess || guess.revealed) return;
      setState({ guesses: { ...guesses, [id]: { ...guess, revealed: true, answer } } });
    },
    restore: ({ state, touched, guesses }) => setState({ state, touched, guesses }, true),
  };
}
