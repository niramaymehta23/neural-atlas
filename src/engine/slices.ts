/**
 * Slices of a worker's work, one after another, giving way between them so messages are heard.
 * While the page is hidden nothing runs: the slice due next is held, and goes first on return.
 * What a run works out never depends on how it was sliced, so holding it changes no results.
 */
export type Later = (next: () => void, wait: number) => void;

const byTimer: Later = (next, wait) => setTimeout(next, wait);

export function createSlices(later: Later = byTimer) {
  let resting = false;
  /** The slice due next: there is only ever one, so a run stopped and started never doubles up. */
  let due: (() => void) | null = null;
  let turn = 0;

  const schedule = (wait: number) => {
    turn += 1;
    const mine = turn;
    later(() => {
      if (mine !== turn || resting || !due) return;
      const slice = due;
      due = null;
      slice();
    }, wait);
  };

  return {
    /** Runs `slice` in `wait` ms, or on return when the page is hidden. Replaces any slice due. */
    next(slice: () => void, wait = 0) {
      due = slice;
      if (!resting) schedule(wait);
    },
    /** The page was hidden (`true`) or is back (`false`). */
    rest(now: boolean) {
      if (now === resting) return;
      resting = now;
      if (!now && due) schedule(0);
    },
  };
}
