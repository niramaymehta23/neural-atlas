"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { DecisionField } from "@/data/DecisionField";
import { gridInputs, toSamples } from "@/data/datasets";
import { PaintCanvas, type PaintWords } from "@/data/PaintCanvas";
import { createFieldReader } from "@/engine/model/forward";
import { ModelEngine } from "@/engine/model/model-engine";
import type { ModuleViewProps } from "@/platform/contract";
import { NetworkView } from "@/visuals/NetworkView";
import { words } from "./captions";
import {
  GARDENS,
  modelOf,
  plant,
  roundPoint,
  stepSize,
  type CellsFrame,
  type CellsState,
} from "./model";

type Props = ModuleViewProps<CellsState, CellsFrame>;

/** The field is worked out on this thread every new practice round: 48 × 48 spots. */
const FIELD = 48;
const GRID = gridInputs(FIELD);
const SEED = 7;
const BATCH = 32;
const SNAPSHOT_EVERY = 10;
const optimiser = (step: number) => ({ kind: "adam" as const, learningRate: stepSize(step) });

/**
 * Trains the team in the worker and hands back what to draw: the newest parameters while live,
 * the recorded ones while scrubbing, and the field they give, repainted on every new round.
 */
function useTeam({ state, update, timeline, side }: Props) {
  const { layers, cells, attempt, points, step, learning } = state;
  const model = useMemo(() => modelOf({ layers, cells }), [layers, cells]);
  const read = useMemo(() => createFieldReader(model), [model]);
  const [engine, setEngine] = useState<ModelEngine | null>(null);
  const [view, setView] = useState<{ params: Float64Array; field: Float32Array } | null>(null);
  // A worker that fails is handed to the lesson's error boundary (thrown from the scene).
  const [failure, setFailure] = useState<Error | null>(null);
  const { live, cursor } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  // The engine starts from the state at that moment; later changes reach it as commands.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });

  useEffect(() => {
    const start = latest.current;
    const created = new ModelEngine({
      backend: "autodiff",
      model,
      data: toSamples(start.points),
      train: {
        optimiser: optimiser(start.step),
        batchSize: BATCH,
        seed: SEED + attempt,
        snapshotEvery: SNAPSHOT_EVERY,
      },
      onSnapshot: (snapshot) => {
        timeline.record(snapshot);
        if (side === "main") update({ epochs: snapshot.epoch }, { touch: false });
      },
      onError: (message) => setFailure(new Error(message)),
    });
    // A shared link replays the run to the moment it was shared.
    if (start.epochs > 0) created.step(start.epochs);
    setEngine(created);
    return () => {
      created.dispose();
      timeline.newRun();
      setView(null);
    };
  }, [model, attempt, timeline, side, update]);

  useEffect(() => engine?.setData(toSamples(points)), [engine, points]);
  useEffect(() => engine?.configure(optimiser(step)), [engine, step]);
  useEffect(() => {
    if (!engine) return;
    if (!learning) return engine.pause();
    timeline.goLive();
    engine.run();
  }, [engine, learning, timeline]);

  // Live: a fresh field whenever the worker has finished another round.
  useEffect(() => {
    if (!engine || !live) return;
    let frame = 0;
    let seen = -1;
    const loop = () => {
      const newest = engine.readLive();
      if (newest && newest.version !== seen) {
        seen = newest.version;
        setView({ params: newest.params, field: read(newest.params, GRID) });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine, live, read]);

  // Scrubbed: the recorded moment.
  const scrubbed = useMemo(() => {
    const shown = live ? undefined : timeline.at(cursor);
    return shown ? { params: shown.params, field: read(shown.params, GRID) } : null;
  }, [live, cursor, timeline, read]);

  const shownEpoch = timeline.at(live ? timeline.getState().length - 1 : cursor)?.epoch ?? 0;
  return { model, view: live ? view : scrubbed, epoch: shownEpoch, failure };
}

const PAINT_WORDS: PaintWords = {
  instructions: words.paint.instructions,
  position: (across, up) => words.paint.position(String(across), String(up)),
  planted: (group, across, up) =>
    words.paint.planted(words.paint.flowers[group] ?? "", String(across), String(up)),
};

/** The garden with its fences on the left, the team of cells on the right. */
export function CellsScene(props: Props) {
  const { state, update } = props;
  const { model, view, epoch, failure } = useTeam(props);
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
              }))
            }
            className="rounded-pill border border-hairline px-3 py-1 aria-pressed:border-accent aria-pressed:bg-paper"
          >
            {words.gardens[garden]}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PaintCanvas
          label={words.garden}
          words={PAINT_WORDS}
          points={state.points}
          group={state.brush}
          onAdd={(point) => update(({ points }) => ({ points: [...points, roundPoint(point)] }))}
        >
          <DecisionField outputs={view?.field ?? null} groups={2} resolution={FIELD} />
        </PaintCanvas>
        <div className="flex flex-col justify-center gap-2">
          <NetworkView sizes={model.sizes} params={view?.params ?? null} label={words.network} />
          <p className="text-sm text-ink-soft">{words.practised(count(epoch))}</p>
        </div>
      </div>
    </div>
  );
}
