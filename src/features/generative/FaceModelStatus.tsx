"use client";

import type { FaceModel } from "./use-face-model";

export type FaceModelWords = {
  /** Shown while the model arrives. */
  loading: string;
  /** Shown when it could not be fetched, with the Try again button. */
  failed: string;
  retry: string;
};

/**
 * What a face lesson shows until its model is ready: a quiet loading line in the picture's own
 * space (so nothing jumps when it arrives), or a plain failure with Try again.
 */
export function FaceModelStatus({
  model,
  words,
  className = "",
}: {
  model: Exclude<FaceModel, { status: "ready" }>;
  words: FaceModelWords;
  className?: string;
}) {
  if (model.status === "failed")
    return (
      <div
        role="alert"
        data-failure="load"
        className={`flex flex-col items-start justify-center gap-3 rounded-card border border-hairline bg-card p-4 ${className}`}
      >
        <p>{words.failed}</p>
        <button
          type="button"
          onClick={model.retry}
          className="min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink md:min-h-0"
        >
          {words.retry}
        </button>
      </div>
    );
  return (
    <div
      data-loading
      className={`flex items-center justify-center rounded-card border border-hairline bg-card p-4 text-sm text-ink-soft ${className}`}
    >
      <p className="motion-safe:animate-pulse">{words.loading}</p>
    </div>
  );
}
