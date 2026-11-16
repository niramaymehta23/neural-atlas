/**
 * The newest parameters, shared between the worker and the page without messages: the worker
 * writes every epoch, visuals read every frame. A seqlock keeps reads whole: the version is odd
 * while a write is in progress, and a read that saw it change is retried next frame.
 * Layout: Int32 version (padded to 8 bytes), then Float64 epoch, loss, parameters.
 */
const HEADER_BYTES = 8;
const FIXED = 2;

export type LiveFrame = { epoch: number; loss: number; params: Float64Array; version: number };

export function createLiveBuffer(parameterCount: number): SharedArrayBuffer {
  return new SharedArrayBuffer(HEADER_BYTES + (FIXED + parameterCount) * 8);
}

function views(buffer: SharedArrayBuffer) {
  return { version: new Int32Array(buffer, 0, 1), values: new Float64Array(buffer, HEADER_BYTES) };
}

export function writeLive(
  buffer: SharedArrayBuffer,
  epoch: number,
  loss: number,
  params: Float64Array,
): void {
  const { version, values } = views(buffer);
  Atomics.add(version, 0, 1);
  values[0] = epoch;
  values[1] = loss;
  values.set(params.subarray(0, values.length - FIXED), FIXED);
  Atomics.add(version, 0, 1);
}

/** A whole copy of the newest write, or null if none has landed or one is half done. */
export function readLive(buffer: SharedArrayBuffer): LiveFrame | null {
  const { version, values } = views(buffer);
  const before = Atomics.load(version, 0);
  if (before === 0 || before % 2 === 1) return null;
  const copy = values.slice();
  if (Atomics.load(version, 0) !== before) return null;
  return { epoch: copy[0] ?? 0, loss: copy[1] ?? 0, params: copy.subarray(FIXED), version: before };
}
