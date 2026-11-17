/** Messages between the page and the map worker. `run` tells one run's messages from the next. */
export type MapCommand =
  | {
      type: "start";
      run: number;
      /** `count` rows of `dims` measurements each. */
      data: Float64Array;
      dims: number;
      perplexity: number;
      seed: number;
    }
  /** Keep stepping until this many steps have been taken (a paused run sits still). */
  | { type: "go"; run: number; until: number }
  | { type: "pause"; run: number };

export type MapEvent =
  /** A recorded moment: every `RECORD_EVERY` steps, and the start (step 0). */
  | {
      type: "frame";
      run: number;
      step: number;
      positions: Float32Array;
      cost: number;
      /** How evenly spread the map is (about 1) or gathered into islands (well below 1). */
      spacing: number;
    }
  /** Stepping stopped: it reached `until`, or was paused. */
  | { type: "stopped"; run: number; step: number }
  | { type: "error"; message: string };

/** Steps between recorded moments. */
export const RECORD_EVERY = 10;
