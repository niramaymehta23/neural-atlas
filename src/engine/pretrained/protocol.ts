/** The typed conversation between AttentionReader (main thread) and the attention worker. */
import type { Reading } from "./attention";

export type AttentionCommand = { type: "read"; id: number; sentence: string };

export type AttentionEvent =
  | { type: "reading"; id: number; reading: Reading }
  | { type: "error"; id: number; message: string };
