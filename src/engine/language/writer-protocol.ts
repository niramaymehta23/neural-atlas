/** Messages between the page and baby GPT's worker. `run` tells one run's messages from the next. */
import type { WriterMoment, WriterRunConfig } from "./baby-gpt";

export type WriterCommand =
  | { type: "start"; run: number; config: WriterRunConfig }
  /** Keep practising until this many steps have been taken (a paused run sits still). */
  | { type: "go"; run: number; until: number }
  | { type: "pause"; run: number }
  /** The page is hidden: practice holds still until it is shown again. */
  | { type: "rest"; resting: boolean };

export type WriterEvent =
  /** A recorded moment: the start (step 0), then every MOMENT_EVERY steps. */
  | ({ type: "moment"; run: number } & WriterMoment)
  /** Practice stopped: it reached `until`, or was paused. */
  | { type: "stopped"; run: number; step: number }
  | { type: "error"; message: string };
