/**
 * Snapshot links: a lesson's whole view (state, guesses, first touch, timeline moment) as
 * versioned, deflated, base64url JSON in the URL hash, so opening the link restores it exactly.
 * A link can be hand-made, so restored state keeps only known keys holding the same kind of
 * finite value, then runs through the module's `parseState`, which clamps it to what the scene
 * can draw; guesses keep only known predictions and choices.
 */
import type { Json, LessonModule, ModuleState } from "../contract";
import type { Guess, ModuleView } from "../module-store";

/** v2 saves the moment as an epoch (v1 saved a buffer position, which differs between runs). */
export const SNAPSHOT_VERSION = 2;
const PARAM = "s";
/** Links longer than this are refused before inflating, and not offered when sharing. */
export const MAX_LINK_CHARS = 32_000;
const MAX_JSON_BYTES = 2_000_000;

export type Snapshot = ModuleView & {
  v: typeof SNAPSHOT_VERSION;
  /** The lesson it belongs to. */
  id: string;
  /** The epoch of the timeline moment shown, or null when following live. */
  momentEpoch: number | null;
  /** A v1 link's moment: a position in the recorded frames. */
  momentIndex?: number | null;
};

export type DecodeFailure = "version" | "lesson" | "broken" | "size";
export type Decoded = { ok: true; snapshot: Snapshot } | { ok: false; reason: DecodeFailure };

async function pipe(bytes: Uint8Array<ArrayBuffer>, through: GenericTransformStream) {
  const reader = new Blob([bytes]).stream().pipeThrough(through).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (let read = await reader.read(); !read.done; read = await reader.read()) {
    size += read.value.length;
    if (size > MAX_JSON_BYTES) throw new Error("Snapshot too large");
    chunks.push(read.value);
  }
  const out = new Uint8Array(size);
  chunks.reduce((offset, chunk) => (out.set(chunk, offset), offset + chunk.length), 0);
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function encodeSnapshot(
  snapshot: Omit<Snapshot, "v" | "momentIndex">,
): Promise<string> {
  const json = JSON.stringify({ v: SNAPSHOT_VERSION, ...snapshot });
  return toBase64Url(
    await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw")),
  );
}

const sameKind = (a: unknown, b: unknown) =>
  typeof a === typeof b && Array.isArray(a) === Array.isArray(b) && (a === null) === (b === null);

/** JSON can still carry 1e999, which parses to Infinity. */
const finite = (value: unknown): boolean =>
  typeof value === "number"
    ? Number.isFinite(value)
    : Array.isArray(value)
      ? value.every(finite)
      : typeof value === "object" && value !== null
        ? Object.values(value).every(finite)
        : true;

/** Keeps saved values only for keys the lesson knows, holding the same kind of finite value. */
function mergeState(initial: ModuleState, saved: unknown): ModuleState {
  if (typeof saved !== "object" || saved === null) return initial;
  const entries = Object.entries(initial).map(([key, value]): [string, Json] => {
    const candidate = (saved as Record<string, Json | undefined>)[key];
    const keep = candidate !== undefined && sameKind(candidate, value) && finite(candidate);
    return [key, keep ? candidate : value];
  });
  return Object.fromEntries(entries);
}

/** Keeps guesses for this lesson's predictions and choices; a revealed one needs its answer. */
function parseGuesses(saved: unknown, predictions: LessonModule["predictions"]) {
  if (typeof saved !== "object" || saved === null) return {};
  const kept: Record<string, Guess> = {};
  for (const [id, raw] of Object.entries(saved)) {
    const choices = predictions.find((prediction) => prediction.id === id)?.choices;
    const known = (choice: unknown) => choices?.some((known) => known.id === choice) ?? false;
    const guess = raw as Partial<Guess> | null;
    if (!guess || !known(guess.choice) || typeof guess.revealed !== "boolean") continue;
    if (guess.revealed && !known(guess.answer)) continue;
    kept[id] = {
      choice: guess.choice as string,
      revealed: guess.revealed,
      ...(guess.revealed && { answer: guess.answer as string }),
    };
  }
  return kept;
}

const wholeNumber = (value: unknown) =>
  Number.isInteger(value) && (value as number) >= 0 ? (value as number) : null;

/** The view a link holds for this lesson, or why it cannot be opened. */
export async function decodeSnapshot(
  encoded: string,
  id: string,
  module: Pick<LessonModule, "initialState" | "predictions" | "parseState">,
): Promise<Decoded> {
  if (encoded.length > MAX_LINK_CHARS) return { ok: false, reason: "size" };
  let saved: Partial<Snapshot> & { moment?: unknown };
  try {
    const bytes = await pipe(fromBase64Url(encoded), new DecompressionStream("deflate-raw"));
    saved = JSON.parse(new TextDecoder().decode(bytes)) as typeof saved;
    if (typeof saved !== "object" || saved === null) return { ok: false, reason: "broken" };
  } catch {
    return { ok: false, reason: "broken" };
  }
  const version = saved.v as number;
  if (version !== 1 && version !== SNAPSHOT_VERSION) return { ok: false, reason: "version" };
  if (saved.id !== id) return { ok: false, reason: "lesson" };
  const { initialState, predictions, parseState } = module;
  const merged = mergeState(initialState, saved.state);
  let state: ModuleState;
  try {
    state = parseState ? parseState(merged, initialState) : merged;
  } catch {
    return { ok: false, reason: "broken" };
  }
  return {
    ok: true,
    snapshot: {
      v: SNAPSHOT_VERSION,
      id,
      state,
      guesses: parseGuesses(saved.guesses, predictions),
      touched: saved.touched === true,
      momentEpoch: version === 1 ? null : wholeNumber(saved.momentEpoch),
      ...(version === 1 && { momentIndex: wholeNumber(saved.moment) }),
    },
  };
}

/** The encoded snapshot in a location hash such as "#s=…", if any. */
export function snapshotFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, "")).get(PARAM);
}

export function hashFor(encoded: string): string {
  return `#${PARAM}=${encoded}`;
}
