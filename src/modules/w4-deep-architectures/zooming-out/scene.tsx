"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SIDE } from "@/engine/vision/seeing";
import type { VisionReader } from "@/engine/vision/vision-client";
import { PhotoCanvas } from "@/features/inside/PhotoCanvas";
import { PicturePicker } from "@/features/inside/PicturePicker";
import { SINGLE_PHOTOS, usePhoto } from "@/features/inside/use-photo";
import { useSeen, useVisionReader } from "@/features/inside/use-vision";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { describeShrink } from "./controls";
import {
  blowUp,
  frameFor,
  keyOf,
  lastKnownOf,
  pool,
  TILES,
  toBytes,
  type Keep,
  type ZoomFrame,
  type ZoomState,
} from "./model";

type Props = ModuleViewProps<ZoomState, ZoomFrame>;

const PHOTO_OPTIONS = SINGLE_PHOTOS.map((name) => ({ name, label: words.photos.names[name] }));

/** The photo shrunk by one tile size: the blocks the learner sees and the picture the AI is shown. */
function shrunkOf(pixels: Uint8ClampedArray, tile: number, keep: Keep) {
  const blocks = SIDE / tile;
  const small = pool(pixels, tile, keep);
  return { blocks, bytes: toBytes(small, blocks), shown: blowUp(small, blocks) };
}

/**
 * What the AI says at every shrink of this photo, asked one shrink at a time (the answers fill in
 * as they come). The mission and guess need the whole ladder, not just the shrink on screen.
 */
function useLadder(pixels: Uint8ClampedArray | null, keep: Keep, reader: VisionReader) {
  const [ladder, setLadder] = useState<{
    for: Uint8ClampedArray;
    keep: Keep;
    names: string[];
  } | null>(null);
  const [failed, setFailed] = useState<{ for: Uint8ClampedArray; keep: Keep } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!pixels) return;
    let live = true;
    void (async () => {
      const names: string[] = [];
      try {
        for (const tile of TILES) {
          const seen = await reader.see(shrunkOf(pixels, tile, keep).shown);
          if (!live) return;
          names.push(seen.answers[0]?.name ?? "");
          setLadder({ for: pixels, keep, names: [...names] });
        }
      } catch {
        if (live) setFailed({ for: pixels, keep });
      }
    })();
    return () => {
      live = false;
    };
  }, [pixels, keep, reader, attempt]);
  const current = (made: { for: Uint8ClampedArray; keep: Keep } | null) =>
    made !== null && made.for === pixels && made.keep === keep;
  return {
    names: ladder && current(ladder) ? ladder.names : [],
    failed: current(failed),
    retry: () => {
      setFailed(null);
      setAttempt((count) => count + 1);
    },
  };
}

export function ZoomScene({ state, update, timeline, side }: Props) {
  const editable = side === "main";
  const { reader } = useVisionReader();
  const photo = usePhoto(state.photo);
  const tile = TILES[state.shrink] ?? 1;
  const shrunk = useMemo(
    () => (photo.pixels ? shrunkOf(photo.pixels, tile, state.keep) : null),
    [photo.pixels, tile, state.keep],
  );
  const now = useSeen(shrunk?.shown ?? null);
  const ladder = useLadder(photo.pixels, state.keep, reader);

  // The full ladder of answers is recorded, so the mission and guess can check it.
  const readings = useRef(0);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  const complete = ladder.names.length === TILES.length ? ladder.names : null;
  useEffect(() => {
    if (!complete) return;
    readings.current += 1;
    timeline.record(frameFor(latest.current, complete, readings.current));
  }, [complete, timeline]);

  const full = ladder.names[0];
  const named = now.seen?.answers[0]?.name;
  const answer = !photo.pixels
    ? words.loading
    : !named
      ? words.looking
      : state.shrink > 0 && full !== undefined && named !== full
        ? words.lost(named, full)
        : words.says(named);
  const failure = now.failure !== null || ladder.failed;

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="zooming-out"
      data-key={keyOf(state)}
      data-ladder={ladder.names.length}
      data-last-known={complete ? lastKnownOf(complete) : ""}
    >
      {editable && (
        <PicturePicker
          photos={PHOTO_OPTIONS}
          value={state.photo}
          onPick={(name) => update({ photo: name as ZoomState["photo"] })}
          words={{ label: words.photos.label }}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <figure className="flex flex-col gap-1">
          <figcaption className="text-xs text-ink-soft">{words.photoTitle}</figcaption>
          <PhotoCanvas pixels={photo.pixels} side={SIDE} label={words.photo} />
        </figure>
        <figure className="flex flex-col gap-1">
          <figcaption className="text-xs text-ink-soft">{words.shrunkTitle}</figcaption>
          <PhotoCanvas
            pixels={shrunk?.bytes ?? null}
            side={shrunk?.blocks ?? SIDE}
            label={words.shrunk(describeShrink(state.shrink))}
            pixelated
          />
        </figure>
      </div>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-14 flex-col gap-1 text-sm">
        {photo.failed ? (
          <p role="alert" className="flex flex-wrap items-center gap-2">
            {words.photoFailed}
            <button
              type="button"
              onClick={photo.retry}
              className="min-h-11 rounded-pill border border-hairline bg-paper px-4 text-accent-ink"
            >
              {words.retry}
            </button>
          </p>
        ) : failure ? (
          <p role="alert" className="flex flex-wrap items-center gap-2">
            {words.failed}
            <button
              type="button"
              onClick={() => {
                if (now.failure) now.retry();
                if (ladder.failed) ladder.retry();
              }}
              className="min-h-11 rounded-pill border border-hairline bg-paper px-4 text-accent-ink"
            >
              {words.retry}
            </button>
          </p>
        ) : (
          <p data-answer aria-live="polite">
            {answer}
          </p>
        )}
      </div>
      <section aria-label={words.ladder.title} className="flex flex-col gap-1">
        <h3 className="text-xs text-ink-soft">{words.ladder.title}</h3>
        <ol className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
          {TILES.map((_, step) => {
            const name = ladder.names[step];
            const here = step === state.shrink;
            const same = name !== undefined && name === full;
            return (
              <li
                key={step}
                aria-current={here ? "step" : undefined}
                className={`flex min-h-11 flex-col justify-center rounded-card border px-2 ${here ? "border-ink bg-card" : "border-hairline"}`}
              >
                <span className="text-ink-soft">{describeShrink(step)}</span>
                <span className={same ? "" : "font-medium"}>
                  {same && step > 0 && <span aria-hidden>✓ </span>}
                  {name ?? words.ladder.waiting}
                  {name !== undefined && step > 0 && (
                    <span className="sr-only">
                      {`, ${same ? words.ladder.same : words.ladder.changed}`}
                    </span>
                  )}
                </span>
                {here && <span className="sr-only">{`, ${words.ladder.here}`}</span>}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
