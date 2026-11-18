"use client";

import type { Loaded } from "./use-language-file";

export type FileStatusWords = {
  /** Shown while the file arrives. */
  loading: string;
  /** Shown when it could not be fetched, with the Try again button. */
  failed: string;
  retry: string;
};

/**
 * What a language lesson shows until its file is ready: a quiet loading line in the scene's own
 * space (so nothing jumps when it arrives), or a plain failure with Try again.
 */
export function LanguageFileStatus<T>({
  loaded,
  words,
  className = "",
}: {
  loaded: Exclude<Loaded<T>, { status: "ready" }>;
  words: FileStatusWords;
  className?: string;
}) {
  if (loaded.status === "failed")
    return (
      <div
        role="alert"
        data-failure="load"
        className={`flex flex-col items-start justify-center gap-3 rounded-card border border-hairline bg-card p-4 ${className}`}
      >
        <p>{words.failed}</p>
        <button
          type="button"
          onClick={loaded.retry}
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
      {/* Only the dot pulses, so the words keep their full contrast. */}
      <p className="flex items-center gap-2">
        <span aria-hidden className="size-2 rounded-pill bg-ink-soft motion-safe:animate-pulse" />
        {words.loading}
      </p>
    </div>
  );
}
