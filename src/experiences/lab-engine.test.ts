import { gridInputs, makeDataset, type DatasetName } from "@/data/datasets";
import {
  createBoardRun,
  BOARD_AGENTS,
  BOARD_STEPS,
  goalOdds,
  LAB_RULES,
} from "@/engine/lab/board-run";
import {
  createGardenRun,
  GARDEN_MODELS,
  GARDEN_STEPS,
  type GardenModel,
} from "@/engine/lab/garden-run";
import { LabClient, type LabPort } from "@/engine/lab/lab-client";
import { createLabRun, type LabConfig, type LabMoment } from "@/engine/lab/lab-run";
import {
  cellWeights,
  createMendRun,
  MEND_GOAL,
  MEND_ROUNDS,
  MEND_SIZES,
  THREADS,
  threadAt,
} from "@/engine/lab/mend-run";
import {
  createRaceRun,
  RACE_BUDGET,
  RACE_GOAL,
  RACE_STEPS,
  raceResult,
} from "@/engine/lab/race-run";
import { inProcessLab } from "@/engine/lab/testing/in-process-lab";
import { paramCount } from "@/engine/autodiff/dense";
import { goalChance, policyOf, solve } from "@/engine/rl/mdp";
import type { Tile, World } from "@/engine/rl/gridworld";

const spots = gridInputs(12);
const dots = (name: DatasetName, seed = 1, count = 120) =>
  makeDataset(name, { count, noise: 0.1, seed });
const gardenOf = (model: GardenModel, name: DatasetName = "circles") =>
  ({
    kind: "garden",
    model,
    dots: dots(name),
    fresh: dots(name, 1001, 200),
    spots,
    seed: 1,
  }) as const;

const MARKS: Record<string, Tile> = { "#": "wall", G: "goal", "~": "trap" };
const worldOf = (...rows: string[]): World => ({
  columns: rows[0]?.length ?? 1,
  rows: rows.length,
  tiles: [...rows.join("")].map((mark) => MARKS[mark] ?? "floor"),
  start: rows.join("").indexOf("S"),
});
const WORLD = worldOf("....G", ".##.#", "..~..", "S....");

/** Runs to `steps`, and gives the last moment. */
function finish(config: LabConfig, steps: number): LabMoment {
  const run = createLabRun(config);
  while (run.step < steps) run.advance();
  return run.moment();
}

describe("a garden run", () => {
  it.each(GARDEN_MODELS)("%s learns, replays exactly, and counts its work", (model) => {
    const config = gardenOf(model);
    const run = createGardenRun(config);
    const before = run.moment();
    expect(before.step).toBe(0);
    expect(before.times).toBe(0);
    while (run.step < GARDEN_STEPS[model]) run.advance();
    const after = run.moment();
    const again = finish(config, GARDEN_STEPS[model]);
    expect(again).toEqual(after);
    expect(after.field).toHaveLength(144);
    expect([...after.field].every((chance) => chance >= 0 && chance <= 1)).toBe(true);
    if (model === "line") expect(after.right).toBeLessThan(0.7);
    else expect(after.right).toBeGreaterThan(0.9);
    if (model === "neighbours") {
      // Remembering costs nothing; answering means comparing with every dot.
      expect(after.times).toBe(0);
      expect(after.perAnswer).toBe(2 * 120);
      expect(after.remembered).toBe(120);
    } else expect(after.times).toBeGreaterThan(1000);
  });

  it("works with one lonely dot, and refuses none", () => {
    const one = [{ x: 0.2, y: 0.2, label: 1 }];
    for (const model of GARDEN_MODELS) {
      const moment = finish({ ...gardenOf(model), dots: one, fresh: one }, 5);
      expect(moment.kind === "garden" && Number.isFinite(moment.off)).toBe(true);
    }
    expect(() => createGardenRun({ ...gardenOf("line"), dots: [] })).toThrow();
  });
});

describe("a board run", () => {
  it.each(BOARD_AGENTS)("%s plays, replays exactly, and says how often it arrives", (agent) => {
    const config = { kind: "board", agent, world: WORLD, seed: 1 } as const;
    const steps = BOARD_STEPS[agent];
    const moment = finish(config, steps);
    expect(finish(config, steps)).toEqual(moment);
    if (moment.kind !== "board") throw new Error("not a board");
    expect(moment.right).toBeGreaterThanOrEqual(0);
    expect(moment.right).toBeLessThanOrEqual(1);
    expect(moment.walk[0]).toBe(WORLD.start);
    expect(moment.leanings).toHaveLength(80);
    if (agent === "wanderer") expect(moment.right).toBeLessThan(0.3);
    if (agent === "planner" || agent === "scores") expect(moment.right).toBeGreaterThan(0.8);
  });

  it("works out the odds of arriving as the exact solver does, given long enough", () => {
    const { values, policy } = solve(WORLD, LAB_RULES);
    const leanings = new Float64Array(80);
    policyOf(WORLD, values, LAB_RULES).forEach((move, cell) => {
      if (move >= 0) leanings[cell * 4 + move] = 1;
    });
    expect(goalOdds(WORLD, leanings, 400)).toBeCloseTo(
      goalChance(WORLD, policy, LAB_RULES)[WORLD.start] ?? -1,
      6,
    );
  });

  it("a board with no way through, or no goal at all, is never reached and never crashes", () => {
    for (const world of [worldOf("G#.", "##.", "S.."), worldOf("...", "S..")])
      for (const agent of BOARD_AGENTS) {
        const moment = finish({ kind: "board", agent, world, seed: 2 }, 8);
        expect(moment.kind === "board" && moment.right).toBe(0);
      }
    expect(() =>
      createBoardRun({ kind: "board", agent: "scores", world: { ...WORLD, start: 4 }, seed: 1 }),
    ).toThrow();
  });
});

describe("a race", () => {
  const race = (a: readonly number[], b: readonly number[], rate = 0.03) =>
    ({
      kind: "race",
      budget: RACE_BUDGET,
      racers: [
        { sizes: a, rate },
        { sizes: b, rate },
      ],
      dots: dots("circles"),
      fresh: dots("circles", 1001, 200),
      spots,
      seed: 1,
    }) as const;

  it("hands both teams the same computing, so the smaller practises more rounds", () => {
    const run = createRaceRun(race([2, 4, 1], [2, 16, 16, 1]));
    for (let step = 0; step < 20; step += 1) run.advance();
    const [small, big] = run.moment().teams;
    for (const team of [small, big]) {
      expect(team.times).toBeGreaterThanOrEqual(20 * RACE_BUDGET);
      // At most one round over: the last one it bought.
      expect(team.times - 20 * RACE_BUDGET).toBeLessThan(200_000);
    }
    expect(small.rounds).toBeGreaterThan(big.rounds * 5);
  });

  it("the same team against itself ties exactly, and every race ends", () => {
    const run = createRaceRun(race([2, 8, 1], [2, 8, 1]));
    let result = raceResult(run.moment());
    while (!result && run.step < RACE_STEPS) {
      run.advance();
      result = raceResult(run.moment());
    }
    expect(result).toBe("tie");
    const stuck = createRaceRun(race([2, 1], [2, 1]));
    while (stuck.step < RACE_STEPS) stuck.advance();
    expect(stuck.moment().teams[0].right).toBeLessThan(RACE_GOAL);
    expect(raceResult(stuck.moment())).toBe("tie");
  });

  it("a team that can bend beats one that cannot", () => {
    const run = createRaceRun(race([2, 8, 1], [2, 1]));
    while (!raceResult(run.moment())) run.advance();
    expect(raceResult(run.moment())).toBe("first");
  });
});

describe("break and repair", () => {
  const mend = (cuts: readonly number[], cells: readonly number[]) =>
    ({
      kind: "mend",
      dots: dots("circles"),
      fresh: dots("circles", 1001, 200),
      spots,
      seed: 1,
      cuts,
      cells,
    }) as const;

  it("every thread is its own weight, and every cell owns four", () => {
    const all = Array.from({ length: THREADS }, (_, thread) => threadAt(thread));
    expect(new Set(all).size).toBe(THREADS);
    const size = paramCount(MEND_SIZES);
    expect(Math.max(...all)).toBe(size - 2);
    const owned = Array.from({ length: MEND_SIZES[1] }, (_, cell) => cellWeights(cell)).flat();
    expect(new Set(owned).size).toBe(size - 1);
    expect(all.every((at) => owned.includes(at))).toBe(true);
  });

  it("starts repaired, breaks when cut, and mends with practice; a cut thread stays cut", () => {
    const whole = createMendRun(mend([], [])).moment();
    expect(whole.right).toBeGreaterThan(MEND_GOAL);
    const cuts = [16, 17, 3];
    const broken = createMendRun(mend(cuts, [])).moment();
    expect(broken.right).toBeLessThan(MEND_GOAL);
    const run = createMendRun(mend(cuts, [2, 5]));
    while (run.step < 2 * MEND_ROUNDS) run.advance();
    const mended = run.moment();
    expect(mended.right).toBeGreaterThan(broken.right);
    for (const thread of cuts) expect(mended.params[threadAt(thread)]).toBe(0);
    // Only the chosen cells changed.
    const free = new Set([...cellWeights(2), ...cellWeights(5)]);
    mended.params.forEach((value, at) => {
      if (!free.has(at)) expect(value).toBe(broken.params[at]);
    });
    expect(mended.times).toBeGreaterThan(0);
  });
});

describe("the lab's worker, in the page's own process", () => {
  it("practises to where it is told, and starts cleanly when the setting changes", async () => {
    const moments: LabMoment[] = [];
    let stopped = -1;
    const { labConnection } = await import("@/engine/lab/lab-client");
    const original = labConnection.connect;
    labConnection.connect = inProcessLab;
    try {
      const client = new LabClient({
        onMoment: (moment) => moments.push(moment),
        onStopped: (step) => {
          stopped = step;
        },
        onError: (message) => {
          throw new Error(message);
        },
      });
      client.start(gardenOf("relay"));
      client.go(60);
      // Changed before the first run could finish.
      client.start(gardenOf("questions"));
      client.go(3);
      await vi.waitFor(() => expect(stopped).toBe(3), { timeout: 10_000 });
      expect(moments.map((moment) => moment.step)).toEqual([0, 1, 2, 3]);
      const last = moments.at(-1);
      expect(last).toMatchObject(finish(gardenOf("questions"), 3));
      client.dispose();
    } finally {
      labConnection.connect = original;
    }
  }, 15_000);

  it("reports a worker that cannot start, and a garden with nothing in it", async () => {
    const { labConnection } = await import("@/engine/lab/lab-client");
    const original = labConnection.connect;
    const errors: string[] = [];
    const options = { onMoment: () => {}, onError: (message: string) => errors.push(message) };
    try {
      labConnection.connect = (): LabPort => {
        throw new Error("no workers here");
      };
      new LabClient(options);
      await vi.waitFor(() => expect(errors).toEqual(["no workers here"]), { timeout: 10_000 });
      labConnection.connect = inProcessLab;
      new LabClient(options).start({ ...gardenOf("line"), dots: [] });
      await vi.waitFor(() => expect(errors).toHaveLength(2), { timeout: 10_000 });
    } finally {
      labConnection.connect = original;
    }
  }, 25_000);
});
