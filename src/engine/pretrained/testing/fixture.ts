/** Recorded real-model readings, stored as base64 float32 so tests never need the model. */
import type { Reading } from "../attention";

export type StoredReading = Omit<Reading, "weights"> & { sentence: string; weights: string };

export function storeReading(sentence: string, reading: Reading): StoredReading {
  const { weights, ...rest } = reading;
  const bytes = new Uint8Array(weights.buffer, weights.byteOffset, weights.byteLength);
  return { sentence, ...rest, weights: Buffer.from(bytes).toString("base64") };
}

export function loadReading(stored: StoredReading): Reading {
  const bytes = Buffer.from(stored.weights, "base64");
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const { words, pieces, layers, heads } = stored;
  return { words, pieces, layers, heads, weights: new Float32Array(copy.buffer) };
}
