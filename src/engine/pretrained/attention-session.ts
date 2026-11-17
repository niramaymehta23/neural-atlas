/**
 * The worker's side of reading sentences, kept apart from Transformers.js so it can be tested:
 * the model loads once (a failed load is tried again next time; a failed reading never throws the
 * loaded model away), sentences are clipped to what the lesson reads, and every reading is split
 * into the learner's own words.
 */
import { wordsOf, type Reading } from "./attention";
import type { FailureStage } from "./protocol";

/** A loaded model: how many pieces a word becomes, and the attention for a whole sentence. */
export type LoadedModel = {
  pieces(word: string): number;
  attend(text: string): Promise<{ dims: readonly number[]; data: Float32Array }>;
};

/** A failure that knows whether it happened while loading or while reading one sentence. */
export class ReaderFailure extends Error {
  constructor(
    readonly stage: FailureStage,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "ReaderFailure";
  }
}

export function createSession(load: () => Promise<LoadedModel>) {
  let loading: Promise<LoadedModel> | null = null;
  return {
    async read(sentence: string): Promise<Reading> {
      loading ??= load().catch((error: unknown) => {
        loading = null; // only a failed load is tried again
        throw new ReaderFailure("load", error);
      });
      const model = await loading;
      try {
        const words = wordsOf(sentence);
        const pieces = words.map((word) => model.pieces(word));
        const { dims, data } = await model.attend(words.join(" "));
        const [layers = 0, , heads = 0, size = 0] = dims;
        const expected = 2 + pieces.reduce((sum, count) => sum + count, 0);
        if (size !== expected) throw new Error("The words and the reading do not line up.");
        // Its own buffer, so it can be handed to the page without copying.
        const owned =
          data.byteOffset === 0 && data.byteLength === data.buffer.byteLength ? data : data.slice();
        return { words, pieces, weights: owned, layers, heads };
      } catch (error) {
        throw new ReaderFailure("read", error);
      }
    },
  };
}

/**
 * Turns per-file download progress into one steady 0–1 share that never goes backwards: the
 * runtime counts for `runtimeShare` of it and the model files for the rest. Every arrival is
 * reported, so a watchdog can tell slow from stalled.
 */
export function createProgress(report: (fraction: number) => void, runtimeShare = 0.4) {
  const files = new Map<string, { loaded: number; total: number }>();
  let runtime = 0;
  let shown = 0;
  const emit = () => {
    const known = [...files.values()];
    const total = known.reduce((sum, file) => sum + file.total, 0);
    const loaded = known.reduce((sum, file) => sum + Math.min(file.loaded, file.total), 0);
    const model = total > 0 ? loaded / total : 0;
    const fraction = runtime * runtimeShare + model * (1 - runtimeShare);
    shown = Math.max(shown, Math.min(1, fraction));
    // Reported on every arrival, even when the share holds still (a file sent without its size
    // adds nothing to it): each report tells the reader the model is still coming, not stalled.
    report(shown);
  };
  return {
    runtime(loaded: number, total: number) {
      runtime = total > 0 ? Math.min(1, loaded / total) : 0;
      emit();
    },
    file(name: string, loaded: number, total: number) {
      files.set(name, { loaded, total });
      emit();
    },
    fileDone(name: string) {
      const file = files.get(name);
      if (file) files.set(name, { loaded: file.total, total: file.total });
      emit();
    },
  };
}
