"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { DecisionField } from "@/data/DecisionField";
import { gridInputs, toSamples, type Point } from "@/data/datasets";
import { PaintCanvas, type PaintWords } from "@/data/PaintCanvas";
import { ModelEngine } from "@/engine/model/model-engine";
import type { ModuleViewProps } from "@/platform/contract";
import { NetworkView, type HiddenCell } from "@/visuals/NetworkView";
import { words } from "./captions";
import {
  beginning,
  bendsOf,
  canLearn,
  ERASER,
  gardenChange,
  GARDENS,
  modelOf,
  optimiser,
  plant,
  plantInto,
  readerFor,
  roundPoint,
  runKey,
  scheduleOf,
  SEED,
  type Bend,
  type CellsFrame,
  type CellsState,
  type Change,
} from "./model";

type Props = ModuleViewProps<CellsState, CellsFrame>;

/** The field is worked out on this thread: 48 × 48 spots, at most once per animation frame. */
const FIELD = 48;
const GRID = gridInputs(FIELD);
const BATCH = 32;
const SNAPSHOT_EVERY = 10;
/** At most ten recorded moments a second while practising (MLP-03): each one also saves `epochs`. */
const SNAPSHOT_MS = 100;
/** A redraw slower than this skips the next frame, so the page keeps its 60 fps (MLP-01). */
const BUSY_MS = 8;

type View = {
  params: ArrayLike<number>;
  field: Float32Array;
  /** Per layer of the drawing (inputs first), how busy each cell is, 0–1. */
  activity: number[][];
  /** Per connection, how much its weight just moved, 0–1 (the corrections flowing back). */
  flow: number[] | null;
};

/** Where each weight sits in the parameters, in the order the network's threads are drawn. */
function weightIndices(sizes: readonly number[]): number[] {
  const indices: number[] = [];
  let at = 0;
  for (let layer = 1; layer < sizes.length; layer += 1) {
    const fanIn = sizes[layer - 1] ?? 0;
    for (let cell = 0; cell < (sizes[layer] ?? 0); cell += 1) {
      for (let input = 0; input < fanIn; input += 1) indices.push(at + input);
      at += fanIn + 1;
    }
  }
  return indices;
}

/** A hidden cell's own fence as chances: its answer scaled so its strongest says "sure". */
function cellField(values: Float32Array): Float32Array {
  const strongest = values.reduce((max, value) => Math.max(max, Math.abs(value)), 0) || 1;
  return values.map((value) => 0.5 + (0.5 * value) / strongest);
}

/**
 * Trains the team in the worker and hands back what to draw: the newest parameters while live,
 * the recorded ones while scrubbing, and the field they give. A shared link replays its run
 * from the log, exactly, before it shows (ENG-09).
 */
function useTeam({ state, update, timeline, side }: Props) {
  const { layers, cells, attempt, points, step, learning } = state;
  const bendKey = bendsOf(state).join(",");
  const model = useMemo(
    () => modelOf({ layers, cells, bends: bendKey.split(",") as Bend[] }),
    [layers, cells, bendKey],
  );
  const read = readerFor(model);
  const weights = useMemo(() => weightIndices(model.sizes), [model]);
  const [engine, setEngine] = useState<ModelEngine | null>(null);
  const [view, setView] = useState<View | null>(null);
  // A worker that fails is handed to the lesson's error boundary (thrown from the scene).
  const [failure, setFailure] = useState<Error | null>(null);
  const [notice, setNotice] = useState<"tooBig" | "needFlowers" | null>(null);
  const [replayTo, setReplayTo] = useState(0);
  const { live, cursor, length } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  // The engine starts from the state at that moment; later changes reach it as commands.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  /** What the engine was last told: changes are worked out against it. */
  const sent = useRef({ points: state.points, step: state.step });
  /** Logged changes the worker has not yet said it applied, by tag. */
  const pending = useRef(new Map<number, Change>());
  const nextTag = useRef(0);

  useEffect(() => {
    const now = latest.current;
    const run = runKey(now);
    const start = beginning(now);
    const target = now.epochs;
    const main = side === "main";
    const created = new ModelEngine({
      backend: "autodiff",
      model,
      data: toSamples(start.points),
      train: {
        optimiser: optimiser(start.step),
        batchSize: BATCH,
        seed: SEED + now.attempt,
        snapshotEvery: SNAPSHOT_EVERY,
        snapshotMs: SNAPSHOT_MS,
      },
      onSnapshot: (snapshot) => {
        timeline.record({ ...snapshot, run });
        // Replayed moments are already counted in state; new practice is saved as it lands.
        if (main && snapshot.epoch > latest.current.epochs)
          update({ epochs: snapshot.epoch }, { touch: false });
        if (snapshot.epoch >= target) setReplayTo(0);
      },
      onApplied: (tag, epoch) => {
        const change = pending.current.get(tag);
        pending.current.delete(tag);
        // Changes before any practice are part of how the try begins, not of its log.
        if (!change || epoch === 0 || !main) return;
        update(({ log }) => ({ log: [...log, { ...change, epoch }] }), { touch: false });
      },
      onIdle: () => {
        if (main) update({ learning: false }, { touch: false });
        setNotice("needFlowers");
      },
      onDiverged: () => {
        if (main) update({ learning: false }, { touch: false });
        setNotice("tooBig");
      },
      onError: (message) => setFailure(new Error(message)),
    });
    sent.current = { points: now.points, step: now.step };
    pending.current.clear();
    if (target > 0) {
      setReplayTo(target);
      created.step(target, scheduleOf(now));
    }
    setEngine(created);
    return () => {
      created.dispose();
      timeline.newRun();
      setEngine(null);
      setView(null);
      setReplayTo(0);
    };
  }, [model, attempt, timeline, side, update]);

  // Garden and step changes reach the worker tagged, so the log records the round they landed on.
  useEffect(() => {
    if (!engine || sent.current.points === points) return;
    const change = gardenChange(sent.current.points, points);
    sent.current = { ...sent.current, points };
    const tag = (nextTag.current += 1);
    if (change) pending.current.set(tag, { ...change, epoch: 0 });
    engine.setData(toSamples(points), tag);
  }, [engine, points]);

  useEffect(() => {
    if (!engine || sent.current.step === step) return;
    const was = sent.current.step;
    sent.current = { ...sent.current, step };
    const tag = (nextTag.current += 1);
    pending.current.set(tag, { epoch: 0, step, was });
    engine.configure(optimiser(step), tag);
  }, [engine, step]);

  useEffect(() => {
    if (!engine) return;
    if (!learning) return engine.pause();
    if (!canLearn(latest.current.points)) {
      if (side === "main") update({ learning: false }, { touch: false });
      return setNotice("needFlowers");
    }
    setNotice(null);
    timeline.goLive();
    engine.run();
  }, [engine, learning, timeline, side, update]);

  // Pulling up the last flowers of a kind stops the practice: there is nothing left to learn.
  useEffect(() => {
    if (side === "main" && learning && !canLearn(points))
      update({ learning: false }, { touch: false });
  }, [side, learning, points, update]);

  const flowers = useMemo(() => toSamples(points).inputs, [points]);
  const draw = useCallback(
    (params: ArrayLike<number>, previous: ArrayLike<number> | null): View => {
      const hidden = read.hidden(params, flowers);
      const count = flowers.length / 2 || 1;
      const busy = (values: Float32Array, size: number) =>
        Array.from({ length: size }, (_, cell) => {
          let total = 0;
          for (let row = 0; row < count; row += 1)
            total += Math.abs(values[cell * count + row] ?? 0);
          return Math.min(1, total / count);
        });
      const sure = read(params, flowers).reduce((sum, chance) => sum + Math.abs(2 * chance - 1), 0);
      const moved = previous
        ? weights.map((index) => Math.abs((params[index] ?? 0) - (previous[index] ?? 0)))
        : null;
      const most = moved?.reduce((max, value) => Math.max(max, value), 0) || 1;
      return {
        params,
        field: read(params, GRID),
        activity: [
          [0, 0],
          ...hidden.map((values, layer) => busy(values, model.sizes[layer + 1] ?? 0)),
          [flowers.length ? sure / count : 0],
        ],
        flow: moved ? moved.map((value) => value / most) : null,
      };
    },
    [read, flowers, weights, model],
  );

  // Live: a fresh field whenever the worker has finished another round, at most once a frame.
  useEffect(() => {
    if (!engine || !live) return;
    let frame = 0;
    let seen = -1;
    let rest = false;
    let previous: Float64Array | null = null;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (rest) {
        rest = false;
        return;
      }
      const newest = engine.readLive();
      if (!newest || newest.version === seen) return;
      seen = newest.version;
      const started = performance.now();
      setView(draw(newest.params, previous));
      previous = newest.params;
      rest = performance.now() - started > BUSY_MS;
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine, live, draw]);

  // Scrubbed: the recorded moment.
  const scrubbed = useMemo(() => {
    const shown = live ? undefined : timeline.at(cursor);
    return shown ? draw(shown.params, null) : null;
  }, [live, cursor, timeline, draw]);

  const newest = timeline.at(length - 1)?.epoch ?? 0;
  const shownEpoch = live ? newest : (timeline.at(cursor)?.epoch ?? 0);
  return {
    model,
    read,
    view: live ? view : scrubbed,
    epoch: shownEpoch,
    failure,
    notice,
    replay: replayTo > 0 ? { done: Math.min(newest, replayTo), of: replayTo } : null,
  };
}

const PAINT_WORDS: PaintWords = {
  instructions: words.paint.instructions,
  position: (across, up) => words.paint.position(String(across), String(up)),
  planted: (group, across, up) =>
    words.paint.planted(words.paint.flowers[group] ?? "", String(across), String(up)),
  removed: (pulled, across, up) =>
    words.paint.removed(
      pulled === 0 ? words.paint.nothing : words.paint.pulled(count(pulled), pulled === 1),
      String(across),
      String(up),
    ),
};

/** The garden with its fences on the left, the team of cells on the right. */
export function CellsScene(props: Props) {
  const { state, update, side } = props;
  const { model, read, view, epoch, failure, notice, replay } = useTeam(props);
  const [full, setFull] = useState(false);
  const [chosen, setChosen] = useState<HiddenCell | null>(null);
  const planting = useRef<Point[]>([]);
  const flush = useRef(0);
  useEffect(() => () => cancelAnimationFrame(flush.current), []);

  // Plants from one frame go in together: one state change and one message to the worker (MLP-04).
  const onAdd = (point: Point) => {
    planting.current.push(roundPoint(point));
    if (flush.current) return;
    flush.current = requestAnimationFrame(() => {
      flush.current = 0;
      const batch = planting.current;
      planting.current = [];
      update(({ points }) => {
        const planted = plantInto(points, batch);
        setFull(planted.full);
        return { points: planted.points };
      });
    });
  };
  const onRemove = (indices: number[]) => {
    const gone = new Set(indices);
    setFull(false);
    update(({ points }) => ({ points: points.filter((_, index) => !gone.has(index)) }));
  };

  const hidden = model.sizes.slice(1, -1);
  const cell =
    chosen && chosen.layer < hidden.length && chosen.cell < (hidden[chosen.layer] ?? 0)
      ? chosen
      : null;
  const ownFence = useMemo(() => {
    if (!cell || !view) return null;
    const values = read.hidden(view.params, GRID)[cell.layer];
    const mine = values?.subarray(cell.cell * FIELD * FIELD, (cell.cell + 1) * FIELD * FIELD);
    return mine ? { field: cellField(mine), quiet: mine.every((value) => value === 0) } : null;
  }, [cell, view, read]);
  const cellWords = (at: HiddenCell) => [count(at.cell + 1), count(at.layer + 1)] as const;
  if (failure) throw failure;

  return (
    <div className="flex grow flex-col gap-4" data-testid="stacking-cells" data-epoch={epoch}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-soft">{words.start}</span>
        {GARDENS.map((garden) => (
          <button
            key={garden}
            type="button"
            aria-pressed={state.garden === garden}
            onClick={() =>
              // A new garden is a new try, so missions and guesses only see practice on it.
              update(({ attempt }) => ({
                garden,
                points: plant(garden),
                attempt: attempt + 1,
                epochs: 0,
                log: [],
              }))
            }
            className="min-h-11 rounded-pill border border-hairline px-3 py-1 aria-pressed:border-accent aria-pressed:bg-paper md:min-h-0"
          >
            {words.gardens[garden]}
          </button>
        ))}
      </div>
      {replay && (
        <div className="flex flex-col gap-1 text-sm text-ink-soft" data-replaying>
          <p>{words.catchingUp}</p>
          <progress
            value={replay.done}
            max={replay.of}
            aria-label={words.catchingUpLabel}
            className="h-1.5 w-full accent-accent"
          />
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <PaintCanvas
            label={words.garden}
            words={PAINT_WORDS}
            points={state.points}
            group={state.brush === ERASER ? 0 : state.brush}
            erasing={state.brush === ERASER}
            onAdd={onAdd}
            onRemove={onRemove}
          >
            <DecisionField outputs={view?.field ?? null} groups={2} resolution={FIELD} />
          </PaintCanvas>
          {(full || notice) && side === "main" && (
            <p className="text-sm text-ink-soft" data-notice={full ? "full" : notice}>
              {full ? words.full : notice === "tooBig" ? words.tooBig : words.needFlowers}
            </p>
          )}
        </div>
        <div className="flex flex-col justify-center gap-2">
          <NetworkView
            sizes={model.sizes}
            params={view?.params ?? null}
            activations={view?.activity}
            label={words.network}
            flowing={state.learning && Boolean(view?.flow)}
            backward
            flowActivity={view?.flow ?? undefined}
            cellLabel={(at) => words.cell.label(...cellWords(at))}
            onCell={setChosen}
            chosen={cell}
          />
          <p className="text-sm text-ink-soft">{words.practised(count(epoch))}</p>
          {cell && ownFence ? (
            <figure className="flex items-center gap-3 text-sm" data-own-fence>
              <div className="relative size-20 shrink-0 overflow-hidden rounded-control border border-hairline bg-paper">
                <DecisionField outputs={ownFence.field} groups={2} resolution={FIELD} />
              </div>
              <figcaption>
                {words.cell.field(...cellWords(cell))}
                {ownFence.quiet && <span className="block text-ink-soft">{words.cell.quiet}</span>}
              </figcaption>
            </figure>
          ) : (
            <p className="text-sm text-ink-soft">{words.cell.hint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
