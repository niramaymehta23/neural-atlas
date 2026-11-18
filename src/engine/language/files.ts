/**
 * Fetches World 5's language files once per page and keeps them: GPT-2's pieces, GloVe word places
 * the tiny writers and the picture matcher. A fetch that stalls is given up after FETCH_TIMEOUT_MS, and a failure is
 * forgotten, so Try again fetches afresh.
 */
import { readPieceSet, type PieceSet } from "./bpe";
import { PICTURES_PATH, readMatcher, type Matcher } from "./picture-words";
import { readWordPlaces, type WordPlaces } from "./word-places";
import { readWriters, WRITERS_PATH, type Writers, type WritersManifest } from "./writers";

export const PIECES_PATH = "/models/gpt2-pieces-v1/";
export const PLACES_PATH = "/models/glove-words-v1/";
/** Longest wait for one file before saying it could not be fetched. */
export const FETCH_TIMEOUT_MS = 30_000;

/** Where the files come from; tests point `read` at the files on disk. */
export const languageFiles = {
  read: async (path: string): Promise<ArrayBuffer> => {
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(path, { signal: stop.signal });
      if (!response.ok) throw new Error(`${path} answered ${response.status}.`);
      return await response.arrayBuffer();
    } finally {
      clearTimeout(timer);
    }
  },
};

const text = (bytes: ArrayBuffer) => new TextDecoder().decode(bytes);
const cache = new Map<string, Promise<unknown>>();

/** Keeps a promise until it fails, so a failure is never remembered. */
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  const known = cache.get(key);
  if (known) return known as Promise<T>;
  const loading = load();
  cache.set(key, loading);
  loading.catch(() => cache.delete(key));
  return loading;
}

export const loadPieceSet = (): Promise<PieceSet> =>
  once("pieces", async () => {
    const [vocab, merges] = await Promise.all([
      languageFiles.read(`${PIECES_PATH}vocab.json`),
      languageFiles.read(`${PIECES_PATH}merges.txt`),
    ]);
    return readPieceSet(text(vocab), text(merges));
  });

export const loadWordPlaces = (): Promise<WordPlaces> =>
  once("places", async () => {
    const [words, vectors] = await Promise.all([
      languageFiles.read(`${PLACES_PATH}words.txt`),
      languageFiles.read(`${PLACES_PATH}vectors.bin`),
    ]);
    return readWordPlaces(text(words), vectors);
  });

export const loadWriters = (): Promise<Writers> =>
  once("writers", async () => {
    const manifest = JSON.parse(
      text(await languageFiles.read(`${WRITERS_PATH}manifest.json`)),
    ) as WritersManifest;
    const [story, writer] = await Promise.all([
      languageFiles.read(WRITERS_PATH + manifest.storyteller.file),
      languageFiles.read(WRITERS_PATH + manifest.writer.file),
    ]);
    return readWriters(manifest, story, writer);
  });

export const loadMatcher = (): Promise<Matcher> =>
  once("pictures", async () =>
    readMatcher(text(await languageFiles.read(`${PICTURES_PATH}matcher.json`))),
  );

/** Forgets everything fetched (tests only). */
export function forgetLanguageFiles() {
  cache.clear();
}
