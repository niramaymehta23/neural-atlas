"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { classMark, classTone, markPath } from "@/design/encodings";
import { EXAGGERATED_STEPS } from "@/engine/ml/tsne";
import { MapClient } from "@/engine/ml/tsne-client";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  DIMS,
  LIMITS,
  mapConnection,
  runKeyOf,
  thingsOf,
  type MapFrame,
  type MapState,
} from "./model";

type Props = ModuleViewProps<MapState, MapFrame>;

const SEED = 31;
const DOT = 0.022;

/** Words for how far the map has got. */
export const statusOf = (step: number) =>
  step === 0
    ? words.status.jumble
    : step < EXAGGERATED_STEPS
      ? words.status.pulling
      : step < LIMITS.steps.max
        ? words.status.settling
        : words.status.settled;

/**
 * Runs the map in its worker and records every tenth step on the timeline. A link redraws the
 * map up to its saved step; "Let it settle" carries on to the end. A worker failure is thrown
 * from the scene, to the lesson's error boundary.
 */
function useMapRun({ state, update, timeline, side }: Props): Error | null {
  const main = side === "main";
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  const [failure, setFailure] = useState<Error | null>(null);
  const [client, setClient] = useState<MapClient | null>(null);
  const key = runKeyOf(state);
  useEffect(() => {
    const now = latest.current;
    const run = runKeyOf(now);
    const created = new MapClient(
      {
        onFrame: (frame) => {
          timeline.record({
            epoch: frame.step,
            loss: frame.cost,
            positions: frame.positions,
            spacing: frame.spacing,
            run,
          });
          if (main && frame.step > latest.current.steps)
            update({ steps: frame.step }, { touch: false });
        },
        onStopped: (step) => {
          if (main && latest.current.running && step >= LIMITS.steps.max)
            update({ running: false }, { touch: false });
        },
        onError: (message) => setFailure(new Error(message)),
      },
      mapConnection.connect,
    );
    created.start(thingsOf(now.data, now.count).values, DIMS, now.perplexity, SEED + now.attempt);
    created.go(now.running ? LIMITS.steps.max : now.steps);
    setClient(created);
    return () => {
      created.dispose();
      timeline.newRun();
      setClient(null);
    };
  }, [key, timeline, main, update]);

  const wasRunning = useRef(state.running);
  useEffect(() => {
    if (!client) return;
    if (state.running) {
      timeline.goLive();
      client.go(LIMITS.steps.max);
    } else if (wasRunning.current) client.pause();
    wasRunning.current = state.running;
  }, [client, state.running, timeline]);
  return failure;
}

/** Places the map's spots in the square, whatever size the map has grown to. */
function fit(positions: Float32Array): (index: number) => [number, number] {
  let left = Infinity;
  let right = -Infinity;
  let low = Infinity;
  let high = -Infinity;
  for (let index = 0; index < positions.length; index += 2) {
    const x = positions[index] ?? 0;
    const y = positions[index + 1] ?? 0;
    left = Math.min(left, x);
    right = Math.max(right, x);
    low = Math.min(low, y);
    high = Math.max(high, y);
  }
  const half = Math.max(right - left, high - low, 1e-9) / 2;
  const middleX = (left + right) / 2;
  const middleY = (low + high) / 2;
  const scale = 0.92 / half;
  return (index) => [
    ((positions[index * 2] ?? 0) - middleX) * scale,
    -((positions[index * 2 + 1] ?? 0) - middleY) * scale,
  ];
}

/** The map of the things, the moment on screen, and how far it has settled. */
export function MapScene(props: Props) {
  const { state, timeline } = props;
  const failure = useMapRun(props);
  const { live, cursor, length } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  if (failure) throw failure;
  const key = runKeyOf(state);
  const moment = timeline.at(live ? length - 1 : cursor);
  const frame = moment && moment.run === key ? moment : undefined;
  const { kinds } = thingsOf(state.data, state.count);
  const place = frame ? fit(frame.positions) : null;
  const step = frame?.epoch ?? 0;
  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="a-map-of-everything"
      data-step={step}
      data-spacing={frame?.spacing ?? 1}
    >
      <figure className="flex flex-col gap-2">
        <svg
          viewBox="-1 -1 2 2"
          role="img"
          aria-label={words.map}
          className="mx-auto aspect-square w-full max-w-xl rounded-card border border-hairline bg-paper"
        >
          {place &&
            kinds.map((kind, index) => {
              const [x, y] = place(index);
              return state.data === "zoo" ? (
                <path key={index} d={markPath(classMark(kind), x, y, DOT)} fill={classTone(kind)} />
              ) : (
                <circle key={index} cx={x} cy={y} r={DOT * 0.8} fill="var(--color-ink-soft)" />
              );
            })}
        </svg>
        <figcaption className="flex min-h-16 flex-col gap-1 text-sm">
          <span>{statusOf(step)}</span>
          <span
            className="h-2 overflow-hidden rounded-pill border border-ink-soft bg-paper"
            aria-hidden="true"
          >
            <span
              className="block h-full bg-ink"
              style={{ width: `${Math.round((step / LIMITS.steps.max) * 100)}%` }}
            />
          </span>
          <span className="text-ink-soft">{words.legend[state.data]}</span>
        </figcaption>
      </figure>
    </div>
  );
}
