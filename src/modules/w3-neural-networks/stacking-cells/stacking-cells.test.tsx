import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toSamples, type Point } from "@/data/datasets";
import { parameterCount } from "@/engine/model/backends/backend";
import type { Event, Snapshot } from "@/engine/model/protocol";
import { createTrainer } from "@/engine/model/trainer";
import { Timeline } from "@/engine/timeline/timeline";
import { companionStore } from "@/platform/companion/companion";
import { words } from "./captions";
import { CellsControls } from "./controls";
import { definition } from "./index";
import { missions } from "./missions";
import {
  applyChange,
  beginning,
  gardenChange,
  MAX_POINTS,
  modelOf,
  optimiser,
  plant,
  plantInto,
  runKey,
  scheduleOf,
  SEED,
  type CellsFrame,
  type CellsState,
  type Change,
} from "./model";
import { predictions } from "./predictions";

const state = (change: Partial<CellsState> = {}) =>
  ({ ...definition.initialState, ...change }) as CellsState;
/** A moment recorded by the run `of` describes (or another run, by its key). */
const frame = (of: CellsState | string, epoch: number, loss: number, params = new Float64Array()) =>
  ({ epoch, loss, params, run: typeof of === "string" ? of : runKey(of) }) satisfies CellsFrame;
const [oneCellMission, fewCellsMission, overfitMission, quietMission] = missions;

function renderControls(change: Partial<CellsState> = {}) {
  const update = vi.fn();
  render(
    <CellsControls
      state={state(change)}
      update={update}
      timeline={new Timeline<CellsFrame>()}
      side="main"
    />,
  );
  return update;
}

describe("stacking cells: team and companion", () => {
  it("turning the layer dial reshapes the learner's own network and starts afresh", async () => {
    const update = renderControls({ layers: 1, cells: 4 });
    screen.getByRole("slider", { name: "How many layers" }).focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(update).toHaveBeenCalledWith({ layers: 2, epochs: 0, log: [] });
    await vi.waitFor(() => expect(companionStore.getState().hidden).toEqual([4, 4]));
  });

  it("each layer has its own bend, and choosing one changes the model (MLP-07)", async () => {
    const update = renderControls({ layers: 2, cells: 3 });
    const second = screen.getByRole("combobox", { name: "How layer two bends" });
    await userEvent.selectOptions(second, words.bends.relu);
    const bends = update.mock.calls.at(-1)![0].bends as CellsState["bends"];
    expect(bends.slice(0, 2)).toEqual(["tanh", "relu"]);
    expect(modelOf({ layers: 2, cells: 3, bends }).activation).toEqual(["tanh", "relu"]);
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("keeps “Let it learn” off with a hint until both kinds of flowers grow (ENG-08, MLP-03)", () => {
    renderControls({ points: [], garden: "own" });
    const learn = screen.getByRole("button", { name: words.learn });
    expect(learn).toBeDisabled();
    expect(learn).toHaveAccessibleDescription(words.needFlowers);
  });

  it("keeps “Let it learn” off with flowers of one kind only", () => {
    renderControls({
      points: [
        { x: 0, y: 0, label: 1 },
        { x: 0.5, y: 0.5, label: 1 },
      ],
    });
    expect(screen.getByRole("button", { name: words.learn })).toBeDisabled();
  });

  it("starts from the learner's own network and bend (PLT-22)", () => {
    const initial = definition.initialState as CellsState;
    const opened = definition.initialFrom?.(
      { hidden: [4, 4], activation: "relu", convolution: false },
      initial,
    ) as CellsState;
    expect(opened).toMatchObject({ layers: 2, cells: 4 });
    expect(opened.bends.every((bend) => bend === "relu")).toBe(true);
  });
});

describe("stacking cells: missions and the guess", () => {
  const spiral = (change: Partial<CellsState> = {}) =>
    state({ garden: "spiral", points: plant("spiral"), ...change });

  it("the spiral mission needs one cell that stays wrong after long practice", () => {
    const oneCell = spiral({ layers: 1, cells: 1 });
    expect(oneCellMission.when(oneCell, frame(oneCell, 200, 0.67))).toBe(true);
    expect(oneCellMission.when(oneCell, frame(oneCell, 40, 0.67))).toBe(false);
    const four = { ...oneCell, cells: 4 };
    expect(oneCellMission.when(four, frame(four, 200, 0.67))).toBe(false);
    const ring = { ...oneCell, garden: "ring" as const };
    expect(oneCellMission.when(ring, frame(ring, 200, 0.67))).toBe(false);
    expect(oneCellMission.when(oneCell, frame(oneCell, 200, 0.05))).toBe(false);
  });

  it("never reads the previous team's last moment (MLP-05)", () => {
    const oneCell = spiral({ layers: 1, cells: 1 });
    const twoCellRun = runKey({ ...oneCell, cells: 2 });
    expect(oneCellMission.when(oneCell, frame(twoCellRun, 200, 0.67))).toBe(false);
    const earlierTry = runKey({ ...oneCell, attempt: oneCell.attempt - 1 });
    expect(oneCellMission.when(oneCell, frame(earlierTry, 200, 0.67))).toBe(false);
    const ring = state({ garden: "ring", layers: 1, cells: 1 });
    expect(predictions[0].answer(ring, frame(runKey({ ...ring, cells: 3 }), 150, 0.6))).toBeNull();
  });

  it("fencing the spiral with eight cells or fewer earns the few-cells star (MLP-07)", () => {
    const seven = spiral({ layers: 1, cells: 7 });
    expect(fewCellsMission.when(seven, frame(seven, 900, 0.1))).toBe(true);
    expect(fewCellsMission.when(seven, frame(seven, 900, 0.3))).toBe(false);
    const nine = spiral({ layers: 3, cells: 3 });
    expect(fewCellsMission.when(nine, frame(nine, 900, 0.1))).toBe(false);
    // Pulling most of the spiral up does not count.
    const thin = { ...seven, points: seven.points.slice(0, 40) };
    expect(fewCellsMission.when(thin, frame(thin, 900, 0.1))).toBe(false);
  });

  it("a big team that learns five flowers by heart earns the overfit star (MLP-07)", () => {
    const five: Point[] = [
      { x: -0.5, y: 0.2, label: 0 },
      { x: 0.4, y: 0.3, label: 1 },
      { x: 0.1, y: -0.6, label: 0 },
      { x: -0.2, y: -0.1, label: 1 },
      { x: 0.7, y: 0.7, label: 0 },
    ];
    const big = state({ garden: "own", points: five, layers: 2, cells: 8 });
    expect(overfitMission.when(big, frame(big, 300, 0.01))).toBe(true);
    const six = { ...big, points: [...five, { x: 0, y: 0, label: 1 }] };
    expect(overfitMission.when(six, frame(six, 300, 0.01))).toBe(false);
    const small = { ...big, layers: 1, cells: 8 };
    expect(overfitMission.when(small, frame(small, 300, 0.01))).toBe(false);
    expect(overfitMission.when(big, frame(big, 300, 0.2))).toBe(false);
  });

  it("a layer of cut-off cells silent for every flower earns the quiet star (MLP-07)", () => {
    const team = spiral({ layers: 2, cells: 2, bends: ["relu", "relu", "tanh", "tanh"] });
    const params = new Float64Array(parameterCount([2, 2, 2, 1])).fill(0.3);
    expect(quietMission.when(team, frame(team, 20, 0.69, params))).toBe(false);
    // Layer one: no trust in either position and a big negative nudge, so it never speaks.
    const quiet = params.slice();
    for (const at of [0, 1, 3, 4]) quiet[at] = 0;
    quiet[2] = quiet[5] = -5;
    expect(quietMission.when(team, frame(team, 20, 0.69, quiet))).toBe(true);
    const smooth = { ...team, bends: ["tanh", "tanh", "tanh", "tanh"] as CellsState["bends"] };
    expect(quietMission.when(smooth, frame(smooth, 20, 0.69, quiet))).toBe(false);
  });

  it("answers the ring guess only for one cell on the planted ring after enough practice", () => {
    const [prediction] = predictions;
    const ring = state({ garden: "ring", layers: 1, cells: 1 });
    expect(prediction.answer(ring, frame(ring, 50, 0.6))).toBeNull();
    expect(prediction.answer(ring, frame(ring, 150, 0.55))).toBe("no");
    const team = state({ garden: "ring" });
    expect(prediction.answer(team, frame(team, 150, 0.1))).toBeNull();
  });

  it("says what the team does in a plain sentence, quietly while it practises", () => {
    const describe = definition.describe!;
    expect(describe(state({ points: [] }), undefined)).toBe(words.describe.empty);
    const team = state({ layers: 1, cells: 1 });
    expect(describe(team, undefined)).toBe("A team of one cell hasn’t practised yet.");
    const params = new Float64Array([1, 0, 0, 5, 0]);
    expect(describe({ ...team, learning: true }, frame(team, 30, 0.4, params))).toBe(
      "A team of one cell is practising.",
    );
    expect(describe(team, frame(team, 30, 0.4, params))).toMatch(
      /^A team of one cell has practised 30 times and puts .+ of the 160 flowers on the right side of its fences\.$/,
    );
  });
});

describe("stacking cells: links (PLT-02, ENG-09)", () => {
  const initial = definition.initialState as CellsState;
  const parse = (saved: Partial<CellsState>) =>
    definition.parseState!({ ...initial, ...saved }, initial) as CellsState;

  it("clamps a hand-made link's dials, garden and practice", () => {
    const parsed = parse({
      layers: 100000,
      cells: -3,
      step: 9,
      brush: 7,
      learning: true,
      epochs: 1e9,
      points: Array(5000).fill(initial.points[0]),
    });
    expect(parsed).toMatchObject({ layers: 4, cells: 1, step: 1, brush: 2, learning: false });
    expect(parsed.epochs).toBe(5000);
    expect(parsed.points).toHaveLength(MAX_POINTS);
  });

  it("drops a log that cannot be worked back, and starts that garden afresh", () => {
    const points = plant("blobs");
    const good: Change[] = [{ epoch: 40, added: points.slice(-2) }];
    expect(parse({ points, epochs: 80, log: good })).toMatchObject({ epochs: 80, log: good });
    const wrongTail: Change[] = [{ epoch: 40, added: [{ x: 0.123, y: 0.4, label: 1 }] }];
    expect(parse({ points, epochs: 80, log: wrongTail })).toMatchObject({ epochs: 0, log: [] });
    const later: Change[] = [{ epoch: 120, step: 0.5, was: 0.3 }];
    expect(parse({ points, epochs: 80, log: later })).toMatchObject({ epochs: 0, log: [] });
    const backwards: Change[] = [
      { epoch: 60, step: 0.5, was: 0.3 },
      { epoch: 20, step: 0.6, was: 0.5 },
    ];
    expect(parse({ points, epochs: 80, log: backwards })).toMatchObject({ epochs: 0, log: [] });
  });

  it("works the log back to how the try began, and forward again", () => {
    const start = plant("blobs").slice(0, 10);
    let points = start;
    const log: Change[] = [];
    const added = { epoch: 10, added: [{ x: 0.1, y: 0.1, label: 1 }] };
    points = applyChange(points, added);
    log.push(added);
    const pulled = gardenChange(
      points,
      points.filter((_, index) => index !== 3 && index !== 7),
    );
    expect(pulled).toEqual({
      removed: [
        { at: 3, point: points[3] },
        { at: 6, point: points[7] },
      ],
    });
    const removed = { epoch: 25, ...pulled! } as Change;
    points = applyChange(points, removed);
    log.push(removed, { epoch: 30, step: 0.8, was: 0.3 });
    expect(beginning({ points, step: 0.8, log })).toEqual({ points: start, step: 0.3 });
    const schedule = scheduleOf({ points, step: 0.8, log });
    expect(schedule.map(({ epoch }) => epoch)).toEqual([10, 25, 30]);
    expect(schedule[1]!.data!.count).toBe(9);
    expect(schedule[2]!.optimiser).toEqual(optimiser(0.8));
  });

  it("a link replays the learner's run to identical parameters, changes and all", async () => {
    const team = state({
      garden: "blobs",
      points: plant("blobs").slice(0, 60),
      layers: 1,
      cells: 3,
    });
    const model = modelOf(team);
    const train = (step: number) => ({
      optimiser: optimiser(step),
      batchSize: 32,
      seed: SEED + team.attempt,
      snapshotEvery: 10,
    });
    const harness = (data: Point[], step: number) => {
      const events: Event[] = [];
      const trainer = createTrainer((event) => events.push(event));
      const ready = trainer.handle({
        type: "init",
        backend: "autodiff",
        model,
        data: toSamples(data),
        train: train(step),
        live: null,
      });
      const last = () =>
        events
          .flatMap((event) => (event.type === "snapshot" ? [event.snapshot] : []))
          .at(-1) as Snapshot;
      return { trainer, ready, events, last };
    };

    // The learner practises, turns the step up at round 50, plants at 70 and pulls up at 90.
    const learner = harness(team.points, team.step);
    await learner.ready;
    const log: Change[] = [];
    let points = team.points;
    await learner.trainer.handle({ type: "step", epochs: 50 });
    await learner.trainer.handle({ type: "configure", optimiser: optimiser(0.7), tag: 1 });
    log.push({ epoch: 50, step: 0.7, was: team.step });
    await learner.trainer.handle({ type: "step", epochs: 20 });
    const planted = [{ x: 0.9, y: 0.9, label: 0 }];
    points = [...points, ...planted];
    await learner.trainer.handle({ type: "setData", data: toSamples(points), tag: 2 });
    log.push({ epoch: 70, added: planted });
    await learner.trainer.handle({ type: "step", epochs: 20 });
    const removed = gardenChange(points, points.slice(1))!;
    points = points.slice(1);
    await learner.trainer.handle({ type: "setData", data: toSamples(points), tag: 3 });
    log.push({ epoch: 90, ...removed } as Change);
    await learner.trainer.handle({ type: "step", epochs: 10 });
    expect(
      learner.events.flatMap((event) => (event.type === "applied" ? [event.epoch] : [])),
    ).toEqual([50, 70, 90]);

    // The link: the state as shared, read back through parseState, replayed from its log.
    const shared = definition.parseState!(
      { ...team, points, step: 0.7, epochs: 100, log },
      definition.initialState,
    ) as CellsState;
    expect(shared.log).toHaveLength(3);
    const start = beginning(shared);
    const link = harness(start.points, start.step);
    await link.ready;
    await link.trainer.handle({
      type: "step",
      epochs: shared.epochs,
      schedule: scheduleOf(shared),
    });
    expect(link.last().epoch).toBe(100);
    expect(link.last().params).toEqual(learner.last().params);
  });
});

describe("stacking cells: the garden (MLP-04)", () => {
  it("500 plants stay at the cap, and say the garden is full", () => {
    const batch = Array.from({ length: 500 }, (_, index) => ({
      x: (index % 50) / 50,
      y: Math.floor(index / 50) / 10,
      label: index % 2,
    }));
    const first = plantInto([], batch);
    expect(first.points).toHaveLength(MAX_POINTS);
    expect(first.full).toBe(true);
    const again = plantInto(first.points, [{ x: 0, y: 0, label: 0 }]);
    expect(again.points).toBe(first.points);
    expect(again.full).toBe(true);
    expect(plantInto([], batch.slice(0, 3))).toEqual({ points: batch.slice(0, 3), full: false });
  });
});
