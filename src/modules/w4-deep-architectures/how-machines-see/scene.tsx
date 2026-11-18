"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SHOWN, STAGES, type Fooled, type Seen } from "@/engine/vision/seeing";
import type { VisionReader } from "@/engine/vision/vision-client";
import { PhotoCanvas } from "@/features/inside/PhotoCanvas";
import { PicturePicker } from "@/features/inside/PicturePicker";
import { useCamera } from "@/features/inside/use-camera";
import { SINGLE_PHOTOS, usePhoto } from "@/features/inside/use-photo";
import { useLiveSeen, useSeen, useVisionReader } from "@/features/inside/use-vision";
import { ValueMap } from "@/features/inside/ValueMap";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { changed, frameFor, keyOf, smudgeView, type SeeFrame, type SeeState } from "./model";

type Props = ModuleViewProps<SeeState, SeeFrame>;

const PHOTO_OPTIONS = SINGLE_PHOTOS.map((name) => ({ name, label: words.photos.names[name] }));
const PICTURE_SIDE = 224;
/** Camera states in which the camera is not the picture (turned off, being asked, or not available). */
const CAMERA_GONE = new Set(["off", "asking", "denied", "missing", "failed"]);

/** The faint smudge for a still picture, worked out by the AI itself (latest only). */
function useFooled(
  pixels: Uint8ClampedArray | null,
  strength: number,
  wanted: boolean,
  reader: VisionReader,
) {
  type For = { pixels: Uint8ClampedArray; strength: number };
  const [result, setResult] = useState<(For & { fooled: Fooled }) | null>(null);
  const [failure, setFailure] = useState<(For & { error: Error }) | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!pixels || !wanted) return;
    let live = true;
    reader.fool(pixels.slice(), strength).then(
      (fooled) => {
        if (live) setResult({ pixels, strength, fooled });
      },
      (error: unknown) => {
        if (!live) return;
        setFailure({
          pixels,
          strength,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );
    return () => {
      live = false;
    };
  }, [pixels, strength, wanted, reader, attempt]);
  const current = (made: For | null) =>
    wanted && made !== null && made.pixels === pixels && made.strength === strength;
  return {
    fooled: result && current(result) ? result.fooled : null,
    failure: failure && current(failure) ? failure.error : null,
    retry: () => {
      setFailure(null);
      setAttempt((count) => count + 1);
    },
  };
}

function Maps({ seen, depth }: { seen: Seen | null; depth: SeeState["depth"] }) {
  const stage = seen?.maps?.find((maps) => maps.stage === depth) ?? null;
  const size = STAGES.find(({ stage: name }) => name === depth)?.size ?? 1;
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="text-xs text-ink-soft">{words.depth.titles[depth]}</figcaption>
      <div className="grid grid-cols-3 gap-1" data-maps={stage ? depth : "none"}>
        {Array.from({ length: SHOWN }, (_, map) => (
          <ValueMap
            key={map}
            values={stage ? stage.maps.subarray(map * size * size, (map + 1) * size * size) : null}
            side={size}
            label={words.map(map + 1)}
          />
        ))}
      </div>
    </figure>
  );
}

export function SeeScene({ state, update, timeline, side }: Props) {
  const editable = side === "main";
  const camera = useCamera();
  const { state: cameraState, video, grab, stop } = camera;
  const { reader } = useVisionReader();
  const [cameraWanted, setCameraWanted] = useState(false);
  // The camera is the picture while the learner wants it and it has not been turned off or refused.
  const cameraOn = cameraWanted && !CAMERA_GONE.has(cameraState);
  // A camera snap stays on this device and out of links: it lives only in the scene.
  const [snap, setSnap] = useState<{ id: number; pixels: Uint8ClampedArray } | null>(null);
  const snaps = useRef(0);

  const photo = usePhoto(cameraOn || snap ? null : state.photo);
  const still = cameraOn ? null : (snap?.pixels ?? photo.pixels);
  const source = snap ? `snap-${snap.id}` : state.photo;

  // A smudge needs a still picture: on the next frame, the camera's picture becomes a snap.
  useEffect(() => {
    if (!state.smudge || !cameraOn) return;
    const frame = requestAnimationFrame(() => {
      const pixels = grab();
      stop();
      setCameraWanted(false);
      if (pixels) setSnap({ id: (snaps.current += 1), pixels });
    });
    return () => cancelAnimationFrame(frame);
  }, [state.smudge, cameraOn, grab, stop]);

  const live = useLiveSeen(grab, cameraOn && cameraState === "on", { maps: true });
  const plain = useSeen(still, { maps: true });
  const smudged = useFooled(still, state.strength, state.smudge, reader);
  const seen = cameraOn ? live.seen : plain.seen;
  const failure = cameraOn ? live.failure : (plain.failure ?? smudged.failure);
  const retry = cameraOn ? live.retry : plain.failure ? plain.retry : smudged.retry;

  const smudgeOnly = useMemo(
    () => (still && smudged.fooled ? smudgeView(still, smudged.fooled.pixels) : null),
    [still, smudged.fooled],
  );

  // Every answer for a still picture is recorded, so the mission and guess can check it.
  const readings = useRef(0);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  const named = plain.seen?.answers[0]?.name ?? null;
  useEffect(() => {
    if (cameraOn || !named || latest.current.smudge) return;
    readings.current += 1;
    timeline.record(frameFor(source, latest.current, named, null, readings.current));
  }, [cameraOn, named, source, timeline, state.smudge]);
  const fooled = smudged.fooled;
  useEffect(() => {
    if (cameraOn || !fooled || !latest.current.smudge) return;
    readings.current += 1;
    const after = fooled.after[0]?.name ?? "";
    timeline.record(
      frameFor(
        source,
        latest.current,
        after,
        changed(fooled.before, fooled.after),
        readings.current,
      ),
    );
  }, [cameraOn, fooled, source, timeline]);

  const answer = (() => {
    if (state.smudge && !cameraOn) {
      if (!fooled) return still ? words.smudge.making : words.loading;
      const before = fooled.before[0]?.name ?? "";
      const after = fooled.after[0]?.name ?? "";
      return changed(fooled.before, fooled.after)
        ? words.fooled(before, after)
        : words.notFooled(after);
    }
    if (seen) return words.says(seen.answers[0]?.name ?? "");
    return cameraOn || still ? words.looking : words.loading;
  })();

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="how-machines-see"
      data-key={keyOf(cameraOn ? "camera" : source, state)}
      data-reads={live.reads}
    >
      {editable && (
        <PicturePicker
          photos={PHOTO_OPTIONS}
          value={cameraOn ? "camera" : snap ? "" : state.photo}
          onPick={(name) => {
            setSnap(null);
            update({ photo: name as SeeState["photo"] });
          }}
          words={{ label: words.photos.label, camera: words.camera }}
          camera={camera}
          onCamera={(on) => {
            setSnap(null);
            setCameraWanted(on);
          }}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <figure className="flex flex-col gap-1">
          <figcaption className="text-xs text-ink-soft">{words.pictureTitle}</figcaption>
          {cameraOn ? (
            <video
              ref={video}
              muted
              playsInline
              aria-label={words.camera.video}
              className="aspect-square h-auto w-full -scale-x-100 rounded-card border border-hairline bg-paper object-cover"
            />
          ) : (
            <PhotoCanvas
              pixels={state.smudge && fooled ? fooled.pixels : still}
              side={PICTURE_SIDE}
              label={state.smudge ? words.smudge.after : words.picture}
              mirrored={snap !== null}
            />
          )}
        </figure>
        <Maps seen={seen} depth={state.depth} />
      </div>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-14 flex-col gap-1 text-sm">
        {photo.failed && !cameraOn && !snap ? (
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
              onClick={retry}
              className="min-h-11 rounded-pill border border-hairline bg-paper px-4 text-accent-ink"
            >
              {words.retry}
            </button>
          </p>
        ) : (
          <p data-answer aria-live={cameraOn ? "off" : "polite"}>
            {answer}
          </p>
        )}
      </div>
      <figure className="flex max-w-56 flex-col gap-1">
        <figcaption className="text-xs text-ink-soft">{words.smudge.title}</figcaption>
        <PhotoCanvas
          pixels={state.smudge ? smudgeOnly : null}
          side={PICTURE_SIDE}
          label={words.smudge.label}
          mirrored={snap !== null}
        />
        <p className="min-h-8 text-xs text-ink-soft">{state.smudge ? "" : words.smudge.off}</p>
      </figure>
    </div>
  );
}
