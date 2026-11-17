"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/design/motion";
import { PicturePicker } from "@/features/inside/PicturePicker";
import { SINGLE_PHOTOS, usePhoto } from "@/features/inside/use-photo";
import { ValueMap } from "@/features/inside/ValueMap";
import { companionStore, useCompanion } from "@/platform/companion/companion";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  findings,
  frameFor,
  GREY_SIDE,
  greyOf,
  keyOf,
  MAP_SIDE,
  NOTHING,
  scores,
  sweptRows,
  torchSpot,
  type TorchFrame,
  type TorchState,
} from "./model";
import { TorchPad } from "./torch-pad";

type Props = ModuleViewProps<TorchState, TorchFrame>;

/** A sweep from start to end takes this long on screen (reduced motion jumps straight there). */
const SWEEP_MS = 2400;
/** At least this share of the map lit counts as "many places". */
const LOTS = 0.05;

const PHOTO_OPTIONS = SINGLE_PHOTOS.map((name) => ({ name, label: words.photos.names[name] }));

/** How much the torch found, in words. */
export function foundWords(state: TorchState, found: Float32Array | null): string {
  if (!found || state.sweep <= 0) return words.found.waiting;
  const rows = sweptRows(state.sweep);
  let lit = 0;
  for (let spot = 0; spot < rows * MAP_SIDE; spot += 1) if ((found[spot] ?? 0) > NOTHING) lit += 1;
  if (lit === 0) return words.found.none;
  return lit / (MAP_SIDE * MAP_SIDE) >= LOTS ? words.found.lots : words.found.some;
}

/** The sweep shown on screen: glides to the learner's sweep rather than jumping. */
function useShownSweep(target: number): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduced || target <= from.current) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const begin = from.current;
    let frame = requestAnimationFrame(function step(now) {
      const along = Math.min(1, (now - start) / (SWEEP_MS * (target - begin)));
      const value = begin + (target - begin) * along;
      from.current = value;
      setShown(value);
      if (along < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);
  return shown;
}

export function TorchScene({ state, update, timeline, side }: Props) {
  const photo = usePhoto(state.photo);
  const grey = useMemo(() => (photo.pixels ? greyOf(photo.pixels) : null), [photo.pixels]);
  const found = useMemo(
    () => (grey ? findings(scores(grey, state.torch), state.strict) : null),
    [grey, state.torch, state.strict],
  );
  const sweep = useShownSweep(state.sweep);
  const spot = torchSpot(sweep);
  const carries = useCompanion((model) => model.convolution);

  // Every finished reading of the photo is recorded, so the mission and guess can check it.
  const readings = useRef(0);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  const key = keyOf(state);
  useEffect(() => {
    if (!grey) return;
    readings.current += 1;
    // `key` holds everything the frame depends on; the state is read as it is now.
    timeline.record(frameFor(latest.current, grey, readings.current));
  }, [grey, key, timeline]);

  // Sweeping a whole photo once gives the learner's own network a pattern torch (stage 08).
  useEffect(() => {
    if (side === "main" && state.sweep >= 1 && !companionStore.getState().convolution) {
      companionStore.update({ convolution: true });
    }
  }, [side, state.sweep]);

  const editable = side === "main";
  const scale = (value: number) => `${((value + 0.5) / GREY_SIDE) * 100}%`;

  return (
    <div className="flex grow flex-col gap-3" data-testid="the-pattern-torch" data-key={key}>
      {editable && (
        <PicturePicker
          photos={PHOTO_OPTIONS}
          value={state.photo}
          onPick={(name) => update({ photo: name as TorchState["photo"] })}
          words={{ label: words.photos.label }}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <figure className="flex flex-col gap-1">
          <figcaption className="text-xs text-ink-soft">{words.photoTitle}</figcaption>
          <div className="relative">
            <ValueMap values={grey} side={GREY_SIDE} label={words.photo} />
            {grey && sweep > 0 && sweep < 1 && (
              <span
                aria-hidden
                data-torch-at={`${spot.row},${spot.column}`}
                className="absolute size-[6%] rounded-sm border-2 border-ink"
                style={{ top: scale(spot.row), left: scale(spot.column) }}
              />
            )}
          </div>
        </figure>
        <figure className="flex flex-col gap-1">
          <figcaption className="text-xs text-ink-soft">{words.mapTitle}</figcaption>
          <ValueMap values={found} side={MAP_SIDE} rows={sweptRows(sweep)} label={words.map} />
        </figure>
      </div>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-14 flex-col gap-1 text-sm">
        {photo.failed ? (
          <p role="alert" className="flex flex-wrap items-center gap-2">
            {words.failed}
            <button
              type="button"
              onClick={photo.retry}
              className="min-h-11 rounded-pill border border-hairline bg-paper px-4 text-accent-ink"
            >
              {words.retry}
            </button>
          </p>
        ) : (
          <p data-found>{grey ? foundWords({ ...state, sweep }, found) : words.loading}</p>
        )}
        {carries && editable && state.sweep >= 1 && (
          <p className="text-ink-soft">{words.companion}</p>
        )}
      </div>
      <TorchPad torch={state.torch} editable={editable} onChange={(torch) => update({ torch })} />
    </div>
  );
}
