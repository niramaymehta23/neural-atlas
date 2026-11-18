"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SIDE } from "@/engine/vision/seeing";
import { count } from "@/design/copy";
import { PhotoCanvas } from "@/features/inside/PhotoCanvas";
import { CameraChoice } from "@/features/inside/PicturePicker";
import { useCamera } from "@/features/inside/use-camera";
import { GROUP_SIZE, PHOTO_GROUPS, photoUrl, readPhoto } from "@/features/inside/use-photo";
import { useLiveSeen, useVisionReader } from "@/features/inside/use-vision";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  bestOf,
  frameFor,
  GROUPS,
  greyDots,
  keyOf,
  MOST_TEACH,
  photoName,
  ready,
  shares,
  STARTS,
  teach,
  TESTS,
  type Example,
  type GiantFrame,
  type GiantState,
  type Start,
} from "./model";

type Props = ModuleViewProps<GiantState, GiantFrame>;

type Numbers = Record<Start, Example[][]>;
/** At most this many camera snaps are kept for each group. */
const MOST_SNAPS = 6;
/** Camera states in which the camera is not showing. */
const CAMERA_GONE = new Set(["off", "asking", "denied", "missing", "failed"]);

/** Every sample photo turned into numbers both ways: by the big AI, and as bare grey dots. */
function useGroupNumbers() {
  const { reader } = useVisionReader();
  const [numbers, setNumbers] = useState<Numbers | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const giant: Example[][] = [];
        const blank: Example[][] = [];
        for (const [group, name] of PHOTO_GROUPS.entries()) {
          const giantGroup: Example[] = [];
          const blankGroup: Example[] = [];
          for (let index = 0; index < GROUP_SIZE; index += 1) {
            const pixels = await readPhoto(photoName(name, index));
            const seen = await reader.see(pixels.slice(), { features: true });
            if (!live) return;
            if (!seen.features) throw new Error("The big AI gave no numbers.");
            giantGroup.push({ numbers: ready(seen.features), group });
            blankGroup.push({ numbers: ready(greyDots(pixels)), group });
          }
          giant.push(giantGroup);
          blank.push(blankGroup);
        }
        if (live) setNumbers({ giant, blank });
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [reader, attempt]);
  return {
    numbers,
    failed,
    retry: () => {
      setFailed(false);
      setAttempt((value) => value + 1);
    },
  };
}

type Snap = { picture: Uint8ClampedArray; giant: Float32Array };
const numbersOf = (start: Start, picture: Uint8ClampedArray, giant: Float32Array) =>
  ready(start === "giant" ? giant : greyDots(picture));

function Thumb({ name, label }: { name: string; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="block aspect-square w-full rounded-sm border border-hairline bg-cover bg-center"
      style={{ backgroundImage: `url(${photoUrl(name)})` }}
    />
  );
}

export function GiantScene({ state, timeline, side }: Props) {
  const editable = side === "main";
  const groups = useGroupNumbers();

  // Both starts taught with the same photos, so the guess can compare them.
  const taught = useMemo(() => {
    if (!groups.numbers) return null;
    const numbers = groups.numbers;
    const result = {} as Record<Start, { answers: number[][]; right: number }>;
    for (const start of STARTS) {
      const sets = numbers[start];
      const learned = teach(sets.flatMap((set) => set.slice(0, state.teach)));
      const answers = sets.map((set) =>
        set.slice(MOST_TEACH).map(({ numbers: values }) => bestOf(shares(learned, values))),
      );
      const right = answers.reduce(
        (sum, guesses, group) => sum + guesses.filter((guess) => guess === group).length,
        0,
      );
      result[start] = { answers, right };
    }
    return result;
  }, [groups.numbers, state.teach]);

  // Every teaching is recorded, so the mission and guess can check it.
  const readings = useRef(0);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  useEffect(() => {
    if (!taught) return;
    readings.current += 1;
    timeline.record(
      frameFor(
        latest.current,
        { giant: taught.giant.right, blank: taught.blank.right },
        readings.current,
      ),
    );
  }, [taught, state.start, timeline]);

  // The learner's own things, taught with camera snaps that never leave the scene.
  const camera = useCamera();
  const { state: cameraState, video, grab } = camera;
  const [cameraWanted, setCameraWanted] = useState(false);
  const cameraOn = cameraWanted && !CAMERA_GONE.has(cameraState);
  const live = useLiveSeen(grab, cameraOn && cameraState === "on", { features: true });
  const [snaps, setSnaps] = useState<Snap[][]>(() => PHOTO_GROUPS.map(() => []));
  const snapReady = snaps.every((group) => group.length > 0);
  const ownGuess = useMemo(() => {
    if (!snapReady || !live.seen?.features || !live.picture) return null;
    const learned = teach(
      snaps.flatMap((group, index) =>
        group.map(({ picture, giant }) => ({
          numbers: numbersOf(state.start, picture, giant),
          group: index,
        })),
      ),
    );
    return bestOf(shares(learned, numbersOf(state.start, live.picture, live.seen.features)));
  }, [snapReady, snaps, live.seen, live.picture, state.start]);
  const snap = (group: number) => {
    if (!live.picture || !live.seen?.features) return;
    const taken = { picture: live.picture, giant: live.seen.features };
    setSnaps((all) =>
      all.map((pictures, index) =>
        index === group ? [...pictures, taken].slice(-MOST_SNAPS) : pictures,
      ),
    );
  };

  const result = taught?.[state.start] ?? null;
  const total = GROUPS * TESTS;

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="standing-on-giants"
      data-key={keyOf(state)}
    >
      <div className="grid grid-cols-3 gap-2">
        {PHOTO_GROUPS.map((group, groupIndex) => (
          <section key={group} aria-label={words.groups[group]} className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">{words.groups[group]}</h3>
            <p className="text-xs text-ink-soft">{words.teaching}</p>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: MOST_TEACH }, (_, index) => (
                <div key={index} className={index < state.teach ? "" : "opacity-25"}>
                  <Thumb
                    name={photoName(group, index)}
                    label={words.photoLabel(words.groups[group], index + 1)}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-soft">{words.kept}</p>
            <ul className="flex flex-col gap-1">
              {Array.from({ length: TESTS }, (_, test) => {
                const guess = result?.answers[groupIndex]?.[test];
                const said = guess === undefined ? null : PHOTO_GROUPS[guess];
                return (
                  <li key={test} className="grid grid-cols-[2rem_1fr] items-center gap-1 text-xs">
                    <Thumb
                      name={photoName(group, MOST_TEACH + test)}
                      label={words.photoLabel(words.groups[group], MOST_TEACH + test + 1)}
                    />
                    <span data-guess={said ?? ""}>
                      {said === null || said === undefined
                        ? words.waiting
                        : said === group
                          ? `✓ ${words.right}`
                          : `✗ ${words.wrong(words.one[said])}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-14 flex-col gap-1 text-sm">
        {groups.failed ? (
          <p role="alert" className="flex flex-wrap items-center gap-2">
            {words.failed}
            <button
              type="button"
              onClick={groups.retry}
              className="min-h-11 rounded-pill border border-hairline bg-paper px-4 text-accent-ink"
            >
              {words.retry}
            </button>
          </p>
        ) : (
          <p data-score={result?.right ?? ""} aria-live="polite">
            {result ? words.score(count(result.right), count(total)) : words.loading}
          </p>
        )}
      </div>
      {editable && (
        <CameraChoice
          camera={camera}
          words={words.camera}
          onCamera={(on) => {
            setSnaps(PHOTO_GROUPS.map(() => []));
            setCameraWanted(on);
          }}
        />
      )}
      {editable && cameraOn && (
        <div className="flex flex-col gap-2" data-reads={live.reads}>
          <video
            ref={video}
            muted
            playsInline
            aria-label={words.camera.video}
            className="aspect-square h-auto w-full max-w-64 -scale-x-100 rounded-card border border-hairline bg-paper object-cover"
          />
          <p className="min-h-10 text-sm" aria-live="off">
            {live.failure
              ? words.failed
              : !live.seen
                ? words.camera.reading
                : ownGuess === null
                  ? words.camera.needs
                  : words.camera.thinks(ownGuess + 1)}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PHOTO_GROUPS.map((group, index) => (
              <div key={group} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => snap(index)}
                  disabled={!live.picture}
                  className="min-h-11 rounded-pill border border-hairline bg-paper px-2 text-sm text-accent-ink disabled:opacity-50"
                >
                  {words.camera.snap(index + 1)}
                </button>
                <div
                  role="group"
                  aria-label={words.camera.snaps(index + 1)}
                  className="grid grid-cols-3 gap-1"
                >
                  {snaps[index]?.map(({ picture }, at) => (
                    <PhotoCanvas
                      key={at}
                      pixels={picture}
                      side={SIDE}
                      label={words.camera.snaps(index + 1)}
                      mirrored
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
