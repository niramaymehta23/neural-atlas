"use client";

import { useState } from "react";
import type { Timeline } from "@/engine/timeline/timeline";
import { platformCaptions } from "./captions";
import type { TimelineFrame } from "./contract";
import type { ModuleStore } from "./module-store";
import { encodeSnapshot, hashFor, MAX_LINK_CHARS } from "./snapshot/snapshot";

type ShareControlProps = {
  lessonId: string;
  store: ModuleStore;
  timeline: Timeline<TimelineFrame>;
  /** Writes into the shell's one status region. */
  announce: (message: string) => void;
};

type Outcome = { kind: "copied" } | { kind: "manual"; url: string } | { kind: "too-big" };

class TooBig extends Error {}

/** Starts writing to the clipboard inside the click itself, so Safari keeps the permission. */
function copyLater(text: Promise<string>): Promise<unknown> {
  const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
  if (clipboard?.write && typeof ClipboardItem !== "undefined") {
    const blob = text.then((value) => new Blob([value], { type: "text/plain" }));
    return clipboard.write([new ClipboardItem({ "text/plain": blob })]);
  }
  if (clipboard?.writeText) return text.then((value) => clipboard.writeText(value));
  return Promise.reject(new Error("No clipboard here."));
}

/**
 * "Copy a link to this view": says it copied only once the clipboard has the link; otherwise
 * shows the link to copy by hand, or says the view is too big for a link. The shell remounts it
 * (by key) whenever the view changes, which clears an old message.
 */
export function ShareControl({ lessonId, store, timeline, announce }: ShareControlProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const share = () => {
    const { live } = timeline.getState();
    const { state, touched, guesses } = store.getState();
    const link = encodeSnapshot({
      id: lessonId,
      state,
      touched,
      guesses,
      momentEpoch: live ? null : (timeline.current()?.epoch ?? null),
    }).then((encoded) => {
      if (encoded.length > MAX_LINK_CHARS) throw new TooBig();
      const url = new URL(window.location.href);
      url.hash = hashFor(encoded);
      return url.href;
    });
    let copied: Promise<unknown>;
    try {
      copied = copyLater(link);
    } catch (error) {
      copied = Promise.reject(error);
    }
    void Promise.allSettled([link, copied]).then(([made, written]) => {
      if (made.status === "rejected") {
        if (made.reason instanceof TooBig) {
          setOutcome({ kind: "too-big" });
          announce(platformCaptions.tooBig);
        } else setOutcome(null);
        return;
      }
      window.history.replaceState(null, "", made.value);
      const next: Outcome =
        written.status === "fulfilled" ? { kind: "copied" } : { kind: "manual", url: made.value };
      setOutcome(next);
      announce(next.kind === "copied" ? platformCaptions.shared : platformCaptions.copyFailed);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4" data-share={outcome?.kind ?? "idle"}>
      <button
        type="button"
        onClick={share}
        className="min-h-11 rounded-pill border border-hairline bg-card px-4 py-2 text-sm md:min-h-0"
      >
        {platformCaptions.share}
      </button>
      {outcome?.kind === "copied" && (
        <p className="text-sm text-ink-soft">{platformCaptions.shared}</p>
      )}
      {outcome?.kind === "too-big" && (
        <p className="text-sm text-ink-soft">{platformCaptions.tooBig}</p>
      )}
      {outcome?.kind === "manual" && (
        <label className="flex w-full max-w-xl flex-col gap-1 text-sm text-ink-soft">
          {platformCaptions.copyFailed}
          <input
            readOnly
            value={outcome.url}
            aria-label={platformCaptions.linkLabel}
            ref={(input) => input?.select()}
            onFocus={(event) => event.target.select()}
            className="w-full rounded-control border border-hairline bg-paper px-3 py-2 text-ink"
          />
        </label>
      )}
    </div>
  );
}
