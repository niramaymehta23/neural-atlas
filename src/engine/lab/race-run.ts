/**
 * Two teams of cells race to sort the same garden with the same computing: each step both are
 * handed the same number of multiplications to spend, so a bigger team practises fewer rounds.
 */
import { createTrainer, startParams, type DenseSpec } from "../autodiff/dense";
import { fieldOf } from "../ml/field";
import type { Dot } from "../ml/types";
import { counting } from "../multiplications";
import type { PracticeRun } from "../practice/protocol";
import { judge } from "./field";
import { networkClassifier } from "./garden-run";

export type Racer = {
  /** Layer sizes, inputs first. */
  sizes: readonly number[];
  /** How big a step it takes each time it corrects itself. */
  rate: number;
};

export type RaceConfig = {
  kind: "race";
  racers: readonly [Racer, Racer];
  dots: readonly Dot[];
  fresh: readonly Dot[];
  spots: Float32Array;
  seed: number;
};

/** Multiplications each team may spend per step. */
export const RACE_BUDGET = 40_000;
/** Steps a race lasts at most. */
export const RACE_STEPS = 120;
/** A team that gets this share of the new dots right has finished. */
export const RACE_GOAL = 0.95;

export type RacerMoment = {
  right: number;
  off: number;
  field: Float32Array;
  params: Float64Array;
  /** Rounds of practice so far. */
  rounds: number;
  times: number;
};

export type RaceMoment = {
  kind: "race";
  step: number;
  teams: readonly [RacerMoment, RacerMoment];
};

function runner(racer: Racer, config: RaceConfig) {
  const spec: DenseSpec = { sizes: racer.sizes, bends: ["tanh"], loss: "logistic" };
  // Both start from the same seed: the same team and the same step would tie exactly.
  const params = startParams(racer.sizes, { seed: config.seed });
  const trainer = createTrainer(
    spec,
    params,
    {
      inputs: config.dots.flatMap((dot) => [dot.x, dot.y]),
      targets: config.dots.map((dot) => dot.label),
    },
    { optimiser: "adam", learningRate: racer.rate, batchSize: 16, seed: config.seed },
  );
  let purse = 0;
  let times = 0;
  return {
    spend() {
      purse += RACE_BUDGET;
      // A round is bought when the purse can pay for it; what it really cost is what is charged.
      while (purse > 0) {
        const cost = counting(() => trainer.round()).times;
        purse -= cost;
        times += cost;
      }
    },
    moment(): RacerMoment {
      const classify = networkClassifier(spec, params);
      return {
        right: judge(classify, config.fresh).right,
        off: judge(classify, config.dots).off,
        field: fieldOf(classify, config.spots, 2),
        params: params.slice(),
        rounds: trainer.rounds,
        times,
      };
    },
  };
}

export function createRaceRun(config: RaceConfig): PracticeRun<RaceMoment> {
  if (config.dots.length === 0) throw new Error("A race needs dots to learn from.");
  const teams = [runner(config.racers[0], config), runner(config.racers[1], config)] as const;
  let step = 0;
  return {
    get step() {
      return step;
    },
    advance() {
      step += 1;
      for (const team of teams) team.spend();
    },
    moment: () => ({
      kind: "race",
      step,
      teams: [teams[0].moment(), teams[1].moment()],
    }),
    every: 1,
  };
}

export type RaceResult = "first" | "second" | "tie";

/** Who has won by now, or null while nobody has and the race has time left. */
export function raceResult({ step, teams }: RaceMoment): RaceResult | null {
  const [first, second] = teams;
  if (first.right < RACE_GOAL && second.right < RACE_GOAL && step < RACE_STEPS) return null;
  if (first.right === second.right) return "tie";
  return first.right > second.right ? "first" : "second";
}
