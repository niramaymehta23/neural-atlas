/**
 * Snapshot links: a lesson's whole view (state, guesses, first touch, timeline moment) as
 * versioned, deflated, base64url JSON in the URL hash, so opening the link restores it exactly.
 * Restored state keeps only known keys holding the same kind of value; a scene should still
 * clamp values it cannot draw, since a link can be hand-made.
 */
import type { Json, ModuleState } from "../contract";
import type { Guess, ModuleView } from "../module-store";

export const SNAPSHOT_VERSION = 1;
const PARAM = "s";
/** Links longer than this are refused before inflating, so a crafted link cannot balloon. */
const MAX_LINK_CHARS = 32_000;
const MAX_JSON_BYTES = 2_000_000;

export type Snapshot = ModuleView & {
  v: typeof SNAPSHOT_VERSION;
  /** The lesson it belongs to. */
  id: string;
  /** The timeline moment shown, or null when following live. */
  moment: number | null;
};

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

export async function encodeSnapshot(snapshot: Omit<Snapshot, "v">): Promise<string> {
  const json = JSON.stringify({ v: SNAPSHOT_VERSION, ...snapshot });
  return toBase64Url(
    await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw")),
  );
}

const sameKind = (a: unknown, b: unknown) =>
  typeof a === typeof b && Array.isArray(a) === Array.isArray(b) && (a === null) === (b === null);

/** Keeps saved values only for keys the lesson knows, holding the same kind of value. */
function mergeState(initial: ModuleState, saved: unknown): ModuleState {
  if (typeof saved !== "object" || saved === null) return initial;
  const entries = Object.entries(initial).map(([key, value]): [string, Json] => {
    const candidate = (saved as Record<string, Json | undefined>)[key];
    return [key, candidate !== undefined && sameKind(candidate, value) ? candidate : value];
  });
  return Object.fromEntries(entries);
}

function parseGuesses(saved: unknown): Record<string, Guess> {
  if (typeof saved !== "object" || saved === null) return {};
  return Object.fromEntries(
    Object.entries(saved).filter(
      ([, guess]: [string, Partial<Guess>]) =>
        typeof guess?.choice === "string" &&
        typeof guess.revealed === "boolean" &&
        (guess.answer === undefined || typeof guess.answer === "string"),
    ),
  );
}

/** The view a link holds for this lesson, or null for another lesson, version or garbage. */
export async function decodeSnapshot(
  encoded: string,
  id: string,
  initialState: ModuleState,
): Promise<Snapshot | null> {
  if (encoded.length > MAX_LINK_CHARS) return null;
  try {
    const bytes = await pipe(fromBase64Url(encoded), new DecompressionStream("deflate-raw"));
    const saved = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Snapshot>;
    if (saved.v !== SNAPSHOT_VERSION || saved.id !== id) return null;
    return {
      v: SNAPSHOT_VERSION,
      id,
      state: mergeState(initialState, saved.state),
      guesses: parseGuesses(saved.guesses),
      touched: saved.touched === true,
      moment: Number.isInteger(saved.moment) ? (saved.moment as number) : null,
    };
  } catch {
    return null;
  }
}

/** The encoded snapshot in a location hash such as "#s=…", if any. */
export function snapshotFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, "")).get(PARAM);
}

export function hashFor(encoded: string): string {
  return `#${PARAM}=${encoded}`;
}
