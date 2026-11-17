/** The typed conversation between AttentionReader (main thread) and the attention worker. */
import type { Reading } from "./attention";

export type AttentionCommand = { type: "read"; id: number; sentence: string };

/**
 * Where a reading failed: starting the model up ("load", nothing is loaded and the next reading
 * tries again) or reading this one sentence ("read", the loaded model stays).
 */
export type FailureStage = "load" | "read";

export type AttentionEvent =
  | { type: "reading"; id: number; reading: Reading }
  | { type: "error"; id: number; stage: FailureStage; message: string }
  /** How much of the model and its runtime has arrived on a first load, 0–1. */
  | { type: "progress"; fraction: number };
