/**
 * Messages between a page and a worker that practises something step by step. `run` tells one
 * run's messages from the next, so a restarted run never hears the old one.
 */
export type PracticeCommand<Config> =
  | { type: "start"; run: number; config: Config }
  /**
   * Keep practising until this many steps have been taken, at most `perSecond` steps a second
   * when given (so a learner can watch), else as fast as it can (a link replaying).
   */
  | { type: "go"; run: number; until: number; perSecond?: number }
  | { type: "pause"; run: number }
  /** The page is hidden: practice holds still until it is shown again. */
  | { type: "rest"; resting: boolean };

export type PracticeEvent<Moment> =
  /** A recorded moment: the start (step 0), then every few steps. */
  | ({ type: "moment"; run: number } & Moment)
  /** Practice stopped: it reached `until`, or was paused. */
  | { type: "stopped"; run: number; step: number }
  | { type: "error"; message: string };

/** One run being practised, as the worker sees it. */
export type PracticeRun<Moment> = {
  readonly step: number;
  advance(): void;
  moment(): Moment;
  /** Steps between recorded moments. */
  every: number;
};
