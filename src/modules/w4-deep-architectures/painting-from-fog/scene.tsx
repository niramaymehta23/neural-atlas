"use client";

import { useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { clearFog, SIDE } from "@/engine/generative/faces";
import { useHoldDrag, type DragPoint } from "@/features/building/use-hold-drag";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import { FaceModelStatus } from "@/features/generative/FaceModelStatus";
import { FacePicture } from "@/features/generative/FacePicture";
import { useFaceModel } from "@/features/generative/use-face-model";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  brushOver,
  fogRun,
  isFinished,
  isMush,
  keyOf,
  steerOf,
  type FogFrame,
  type FogState,
} from "./model";

type Props = ModuleViewProps<FogState, FogFrame>;

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** A brush dab: the pixel and its four neighbours, so a stroke is wide enough to matter. */
export function dab(column: number, row: number): number[] {
  return [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].flatMap(([dx = 0, dy = 0]) => {
    const x = column + dx;
    const y = row + dy;
    return x >= 0 && x < SIDE && y >= 0 && y < SIDE ? [y * SIDE + x] : [];
  });
}

/** The picture in the fog as it clears, with the learner's paint over it. */
export function FogScene(props: Props) {
  const { state, update, timeline } = props;
  const model = useFaceModel("fog");
  const ready = model.status === "ready" ? model : null;
  const work = useMemo(
    () => (current: FogState) =>
      ready ? fogRun(ready.weights, ready.kit.manifest.models.fog, current) : [],
    [ready],
  );
  const { failure } = useRecordedRun({
    ...props,
    runs: ready ? state.runs : 0,
    work,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor, length } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const newest = length > 0 ? timeline.at(length - 1) : undefined;
  // Before the first clearing, the fog it will start from (no cleaning needed to show it).
  const start = useMemo(() => {
    if (!ready) return null;
    const first = clearFog(
      ready.weights,
      ready.kit.manifest.models.fog,
      state.fog,
      1,
      steerOf(state.paint),
    ).next();
    return first.done ? null : first.value.picture;
  }, [ready, state.fog, state.paint]);
  if (failure) throw failure;

  const finished = isFinished(state, newest) ? newest : undefined;
  const verdict =
    state.runs === 0
      ? words.verdict.waiting
      : !finished
        ? words.verdict.working
        : isMush(finished)
          ? words.verdict.mush
          : words.verdict.face;
  const picture = shown?.picture ?? start;

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="painting-from-fog"
      data-epoch={shown?.epoch ?? 0}
    >
      {model.status !== "ready" || !picture ? (
        <FaceModelStatus
          model={model.status === "ready" ? { status: "loading" } : model}
          words={words.model}
          className="aspect-square w-full max-w-sm"
        />
      ) : (
        <PaintablePicture
          picture={picture}
          state={state}
          stale={shown !== undefined && shown.key !== keyOf(state)}
          onPaint={(pixels) =>
            update((now) => ({ paint: brushOver(now.paint, pixels, now.brush) }))
          }
        />
      )}
      {/* A reserved line, so the page does not jump when the words change. */}
      <p
        className="min-h-10 text-sm"
        data-verdict={finished ? (isMush(finished) ? "mush" : "face") : ""}
      >
        {verdict}
      </p>
    </div>
  );
}

function PaintablePicture({
  picture,
  state,
  stale,
  onPaint,
}: {
  picture: ArrayLike<number>;
  state: FogState;
  stale: boolean;
  onPaint: (pixels: number[]) => void;
}) {
  const [cursor, setCursor] = useState<{ column: number; row: number } | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const paintAt = ({ clientX, clientY }: DragPoint) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const column = Math.floor(((clientX - rect.left) / rect.width) * SIDE);
    const row = Math.floor(((clientY - rect.top) / rect.height) * SIDE);
    if (column < 0 || column >= SIDE || row < 0 || row >= SIDE) return;
    onPaint(dab(column, row));
  };
  const { ref, handlers } = useHoldDrag<HTMLDivElement>({ onDrag: paintAt, onTap: paintAt });
  const painted = useMemo(() => [...steerOf(state.paint)], [state.paint]);
  const onKeyDown = (event: KeyboardEvent) => {
    const arrow = ARROWS[event.key];
    const at = cursor ?? { column: SIDE / 2, row: SIDE / 2 };
    if (arrow) {
      event.preventDefault();
      setCursor({
        column: Math.min(SIDE - 1, Math.max(0, at.column + arrow[0])),
        row: Math.min(SIDE - 1, Math.max(0, at.row + arrow[1])),
      });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setCursor(at);
      onPaint(dab(at.column, at.row));
    }
  };
  return (
    <figure className="flex flex-col gap-1">
      <div
        ref={(element) => {
          box.current = element;
          ref.current = element;
        }}
        {...handlers}
        tabIndex={0}
        role="group"
        aria-label={words.picture.label}
        aria-roledescription={words.picture.kind}
        onKeyDown={onKeyDown}
        onBlur={() => setCursor(null)}
        data-painted={painted.length}
        className="relative aspect-square w-full max-w-sm cursor-crosshair touch-pan-y select-none"
      >
        <FacePicture
          picture={picture}
          className={`absolute inset-0 size-full ${stale ? "opacity-60" : ""}`}
        />
        <svg viewBox={`0 0 ${SIDE} ${SIDE}`} aria-hidden className="absolute inset-0 size-full">
          {painted.map(([pixel, ink]) => (
            <rect
              key={pixel}
              x={(pixel % SIDE) + 0.15}
              y={Math.floor(pixel / SIDE) + 0.15}
              width={0.7}
              height={0.7}
              fill={ink ? "var(--color-ink)" : "var(--color-paper)"}
              stroke={ink ? "var(--color-paper)" : "var(--color-ink)"}
              strokeWidth={0.12}
              data-paint={ink ? "ink" : "paper"}
            />
          ))}
          {cursor && (
            <rect
              x={cursor.column - 1}
              y={cursor.row - 1}
              width={3}
              height={3}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={0.2}
              strokeDasharray="0.5 0.3"
              data-cursor
            />
          )}
        </svg>
      </div>
      <figcaption className="flex flex-col gap-1 text-xs text-ink-soft">
        <span>{words.picture.caption}</span>
        <span className="flex flex-wrap gap-x-4">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
              <rect
                x={1}
                y={1}
                width={8}
                height={8}
                fill="var(--color-ink)"
                stroke="var(--color-paper)"
              />
            </svg>
            {words.key.ink}
          </span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
              <rect
                x={1}
                y={1}
                width={8}
                height={8}
                fill="var(--color-paper)"
                stroke="var(--color-ink)"
              />
            </svg>
            {words.key.paper}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
