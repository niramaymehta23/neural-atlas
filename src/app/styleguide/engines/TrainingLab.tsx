"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { count } from "@/design/copy";
import { DecisionField } from "@/data/DecisionField";
import { gridInputs, makeDataset, toSamples, type Point } from "@/data/datasets";
import { PaintCanvas } from "@/data/PaintCanvas";
import { ModelEngine } from "@/engine/model/model-engine";
import type { BackendKind, ModelSpec, Snapshot } from "@/engine/model/protocol";
import { Timeline } from "@/engine/timeline/timeline";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { TimelineScrubber } from "@/ui/TimelineScrubber";
import { Chart } from "@/visuals/Chart";
import { NetworkView } from "@/visuals/NetworkView";

const MODEL: ModelSpec = { sizes: [2, 12, 12, 1], activation: "tanh", loss: "binaryCrossEntropy" };
const TRAIN = {
  optimiser: { kind: "adam" as const, learningRate: 0.03 },
  batchSize: 32,
  seed: 7,
  snapshotEvery: 2,
};
const FIELD = 128;
const GRID = gridInputs(FIELD);
/** How often the field asks the worker for a fresh opinion while training. */
const FIELD_EVERY_MS = 200;
const ENGINES = [
  { value: "autodiff", label: "See-through" },
  { value: "tfjs", label: "Big-model" },
] as const satisfies readonly { value: BackendKind; label: string }[];

const BUTTON = "rounded-pill border border-hairline bg-paper px-4 py-2 text-sm";

/** A spiral learned live in the worker, recorded to a timeline you can scrub and race a ghost on. */
export function TrainingLab() {
  const [backend, setBackend] = useState<BackendKind>("autodiff");
  const [points, setPoints] = useState<Point[]>(() =>
    makeDataset("spiral", { count: 200, seed: 3 }),
  );
  const [timeline] = useState(() => new Timeline<Snapshot>({ capacity: 600 }));
  const state = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const [engine, setEngine] = useState<ModelEngine | null>(null);
  const [running, setRunning] = useState(false);
  const [engineName, setEngineName] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [params, setParams] = useState<Float64Array | null>(null);
  const [field, setField] = useState<Float32Array | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const pointsRef = useRef(points);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    const created = new ModelEngine({
      backend,
      model: MODEL,
      data: toSamples(pointsRef.current),
      train: { ...TRAIN, seed: TRAIN.seed + attempt },
      onSnapshot: (snapshot) => timeline.record(snapshot),
      onError: setFailure,
    });
    void created.ready.then(setEngineName, () => {}); // failures arrive through onError
    setEngine(created);
    return () => {
      created.dispose();
      timeline.newRun();
      setRunning(false);
    };
  }, [backend, attempt, timeline]);

  // Per frame: newest parameters from shared memory while live, else the scrubbed snapshot.
  useEffect(() => {
    if (!engine) return;
    let frame = 0;
    let last = performance.now();
    let seen = -1;
    let lastField = 0;
    let asking = false;
    const loop = (now: number) => {
      timeline.tick((now - last) / 1000);
      last = now;
      if (timeline.getState().live) {
        const live = engine.readLive();
        if (live && live.version !== seen) {
          seen = live.version;
          setParams(live.params);
          if (!asking && now - lastField > FIELD_EVERY_MS) {
            asking = true;
            lastField = now;
            void engine
              .predict(GRID)
              .then(setField, () => {})
              .finally(() => (asking = false));
          }
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine, timeline]);

  // A scrubbed moment: show it, and once the replay stops, have the worker paint its field.
  const shown = state.live ? null : timeline.current();
  useEffect(() => {
    if (!shown || !engine || state.playing) return;
    engine.restore(shown);
    void engine
      .predict(GRID)
      .then(setField)
      .catch(() => {});
  }, [shown, engine, state.playing]);

  const pause = () => {
    engine?.pause();
    setRunning(false);
  };

  const train = () => {
    if (!engine) return;
    if (running) return pause();
    // Scrubbing or a replay left older parameters in the worker: carry on from the newest moment.
    const newest = timeline.at(state.length - 1);
    if (newest && engine.readLive()?.epoch !== newest.epoch) engine.restore(newest);
    timeline.goLive();
    engine.run();
    setRunning(true);
  };

  const addPoint = (point: Point) => {
    const next = [...points, point];
    setPoints(next);
    engine?.setData(toSamples(next));
  };

  const frames = timeline.frames();
  const losses = frames.map(({ loss }) => loss);
  const ghostLosses = timeline.ghostFrames().map(({ loss }) => loss);
  const epoch = (shown ?? frames.at(-1))?.epoch ?? 0;

  if (failure) {
    return (
      <p role="alert" className="text-sm text-ink-soft" data-testid="training-lab-failed">
        The training engine stopped: {failure} Reload the page to try again.
      </p>
    );
  }

  return (
    <div
      className="flex w-full flex-col gap-6"
      data-testid="training-lab"
      data-backend={engineName}
      data-epoch={epoch}
      data-live={String(state.live)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={train} className={`${BUTTON} text-accent-ink`}>
          {running ? "Pause" : "Practise"}
        </button>
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className={BUTTON}>
          Start a new try
        </button>
        <SegmentedControl label="Engine" options={ENGINES} value={backend} onChange={setBackend} />
        <p className="text-sm text-ink-soft">Practised {count(epoch)} times.</p>
      </div>
      <div className="grid w-full gap-6 md:grid-cols-2">
        <PaintCanvas
          label="Spiral: click to add dots to the second group"
          points={points}
          onAdd={addPoint}
          group={1}
        >
          <DecisionField outputs={field} groups={2} resolution={FIELD} />
        </PaintCanvas>
        <div className="flex flex-col gap-4">
          <NetworkView
            sizes={MODEL.sizes}
            params={shown?.params ?? params}
            label="The network learning the spiral"
            flowing
          />
          <Chart
            label="Mistakes shrinking as it practises"
            series={[{ values: ghostLosses, ghost: true }, { values: losses }]}
            marker={state.live ? undefined : state.cursor}
            className="h-28 w-full"
          />
        </div>
      </div>
      <TimelineScrubber
        className="w-full"
        length={state.length}
        position={state.cursor}
        playing={state.playing}
        onPlayToggle={() => {
          pause();
          if (state.playing) timeline.pause();
          else timeline.play();
        }}
        onSeek={(position) => {
          pause();
          timeline.seek(position);
        }}
        losses={losses}
        ghostLosses={ghostLosses}
        live={state.live}
        onLive={() => timeline.goLive()}
      />
    </div>
  );
}
