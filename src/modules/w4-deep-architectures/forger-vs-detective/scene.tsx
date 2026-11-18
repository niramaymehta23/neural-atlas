"use client";

import { useMemo, useSyncExternalStore } from "react";
import { count, outOf } from "@/design/copy";
import { SPOTS, realPoints } from "@/engine/generative/gan";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import type { ModuleViewProps } from "@/platform/contract";
import { CartoonFace } from "./CartoonFace";
import { words } from "./captions";
import { lookAt, realLook } from "./faces";
import {
  duelRun,
  facesOf,
  keyOf,
  ONE_FACE,
  SPOT_COUNT,
  type DuelFrame,
  type DuelState,
} from "./model";

type Props = ModuleViewProps<DuelState, DuelFrame>;

const REAL = realPoints(90);
const GALLERY = 8;
/** The plane runs −1…1 each way; drawn 0…200 with y upwards. */
const toX = (x: number) => 100 + Math.max(-1.1, Math.min(1.1, x)) * 90;
const toY = (y: number) => 100 - Math.max(-1.1, Math.min(1.1, y)) * 90;

/** How many faces the forger draws, in words. */
export function facesLine(frame: Pick<DuelFrame, "shares" | "bunched">) {
  if (frame.bunched >= ONE_FACE) return words.same;
  const faces = facesOf(frame);
  if (faces === 0) return words.faces.none;
  if (faces === 1) return words.faces.one;
  if (faces === SPOT_COUNT) return words.faces.all;
  return words.faces.some(count(faces));
}

const tenths = (share: number) => outOf(share, { total: 10, noun: "times" });

/** The plane of real and forged points, a few forged faces, and the scoreboard. */
export function DuelScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: duelRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;
  const gallery = useMemo(() => {
    if (!ours) return [];
    return Array.from({ length: GALLERY }, (_, index) =>
      lookAt(ours.forged[index * 2] ?? 0, ours.forged[index * 2 + 1] ?? 0),
    );
  }, [ours]);
  if (failure) throw failure;

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="forger-vs-detective"
      data-epoch={ours?.epoch ?? 0}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <figure className="flex min-w-0 flex-col gap-1 sm:w-3/5">
          <svg
            role="img"
            aria-label={words.picture}
            viewBox="0 0 200 200"
            className="h-auto w-full rounded-card border border-hairline bg-paper"
          >
            {SPOTS.map(([x, y], index) => (
              <CartoonFace
                key={index}
                look={realLook(index)}
                x={toX(x) - 13}
                y={toY(y) - 13}
                size={26}
              />
            ))}
            {REAL.map((value, index) =>
              index % 2 === 0 ? (
                <circle
                  key={index}
                  cx={toX(value)}
                  cy={toY(REAL[index + 1] ?? 0)}
                  r={1.6}
                  fill="none"
                  stroke="var(--color-ink-soft)"
                  strokeWidth={0.7}
                />
              ) : null,
            )}
            {ours &&
              ours.forged.map((value, index) =>
                index % 2 === 0 ? (
                  <path
                    key={index}
                    d={`M${toX(value)} ${toY(ours.forged[index + 1] ?? 0) - 2.6}l2.6 2.6l-2.6 2.6l-2.6 -2.6z`}
                    fill="var(--color-flow)"
                    stroke="var(--color-ink)"
                    strokeWidth={0.5}
                    data-fake
                  />
                ) : null,
              )}
          </svg>
          <figcaption className="flex flex-wrap gap-x-4 text-xs text-ink-soft">
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
                <circle cx={5} cy={5} r={3.5} fill="none" stroke="var(--color-ink-soft)" />
              </svg>
              {words.key.real}
            </span>
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
                <path d="M5 1l4 4l-4 4l-4 -4z" fill="var(--color-flow)" stroke="var(--color-ink)" />
              </svg>
              {words.key.fake}
            </span>
          </figcaption>
        </figure>
        <div className="flex min-w-0 flex-col gap-2 text-sm sm:w-2/5">
          <h3 className="font-serif text-base">{words.score.title}</h3>
          {/* Reserved lines, so the page does not jump when the words change. */}
          <div className="flex min-h-20 flex-col gap-1" data-score>
            {ours ? (
              <>
                <ScoreLine text={words.score.fooled(tenths(ours.fooled))} share={ours.fooled} />
                <ScoreLine text={words.score.caught(tenths(ours.caught))} share={ours.caught} />
              </>
            ) : (
              <p>{words.waiting}</p>
            )}
          </div>
          <p
            className="min-h-10"
            data-faces={ours ? facesOf(ours) : undefined}
            data-bunched={ours && ours.bunched >= ONE_FACE ? "" : undefined}
          >
            {ours ? facesLine(ours) : ""}
          </p>
        </div>
      </div>
      <figure className="flex flex-col gap-1">
        <figcaption className="text-xs text-ink-soft">
          {ours ? words.gallery : words.realFaces}
        </figcaption>
        <svg viewBox={`0 0 ${GALLERY * 30} 30`} className="h-auto w-full max-w-md" aria-hidden>
          {(ours ? gallery : Array.from({ length: SPOT_COUNT }, (_, index) => realLook(index))).map(
            (look, index) => (
              <CartoonFace key={index} look={look} x={index * 30 + 2} y={2} size={26} />
            ),
          )}
        </svg>
      </figure>
    </div>
  );
}

function ScoreLine({ text, share }: { text: string; share: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p>{text}</p>
      <div className="h-1.5 w-full rounded-pill bg-hairline" aria-hidden>
        <div
          className="h-full rounded-pill bg-ink-soft"
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </div>
    </div>
  );
}
