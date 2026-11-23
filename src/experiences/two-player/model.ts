import { gridInputs, makeDataset, type DatasetName, type Point } from "@/data/datasets";
import {
  MEND_GOAL,
  MEND_ROUNDS,
  MEND_SIZES,
  THREADS,
  type MendMoment,
} from "@/engine/lab/mend-run";
import { RACE_STEPS, raceResult, type RaceMoment } from "@/engine/lab/race-run";
import type { LabConfig, LabMoment } from "@/engine/lab/lab-run";
import { roundDot } from "@/features/classic/garden";
import { clampWhole, oneOf } from "@/platform/clamp";
import type { ExperienceSpec } from "../shell/use-experience";

/** Gardens hard enough to race on (the last one is too much for the small team being mended). */
export const GARDENS = ["circles", "moons", "xor", "spiral"] as const satisfies DatasetName[];
export type GameGarden = (typeof GARDENS)[number];
export const gardensFor = (game: Game): readonly GameGarden[] =>
  game === "race" ? GARDENS : GARDENS.filter((name) => name !== "spiral");

export const TEAMS = { small: [2, 4, 1], middle: [2, 10, 1], big: [2, 16, 16, 1] } as const;
export type TeamName = keyof typeof TEAMS;
export const TEAM_NAMES = Object.keys(TEAMS) as TeamName[];
export const PACES = { careful: 0.02, steady: 0.1, bold: 0.5 } as const;
export type PaceName = keyof typeof PACES;
export const PACE_NAMES = Object.keys(PACES) as PaceName[];

export type Game = "race" | "mend";
export type Player = 0 | 1;
/** The first player chooses, the screen is passed, the second chooses, then it plays out. */
export const STAGES = ["one", "pass", "two", "play"] as const;
export type Stage = (typeof STAGES)[number];

export const CUTS = 3;
export const CELLS = 2;
export const HIDDEN = MEND_SIZES[1];
export const MEND_STEPS = CELLS * MEND_ROUNDS;
export const MOST_SEEDS = 99;
export const MOST_SCORE = 99;
const DOTS = 120;
const FRESH_DOTS = 200;
const FRESH_SEED = 1000;
export const RESOLUTION = 32;
const SPOTS = gridInputs(RESOLUTION);
const NOISE: Record<GameGarden, number> = { circles: 0.1, moons: 0.08, xor: 0.08, spiral: 0.03 };
/** The arms wind far enough that a small team cannot follow them. */
const SPIN = 7;
/** What a team may spend per step: less where a garden is easy, so every race can be watched. */
const BUDGETS: Record<GameGarden, number> = {
  circles: 5_000,
  moons: 8_000,
  xor: 3_000,
  spiral: 40_000,
};

export type TwoState = {
  game: Game;
  garden: GameGarden;
  seed: number;
  stage: Stage;
  /** Each player's team in the race. */
  teams: TeamName[];
  paces: PaceName[];
  /** Who cuts in this round of break and repair; the other repairs. */
  breaker: number;
  cuts: number[];
  cells: number[];
  steps: number;
  running: boolean;
  /** This round's win has been counted. */
  counted: boolean;
  /** Rounds won: race one, race two, repair one, repair two. */
  score: number[];
};

const initialState: TwoState = {
  game: "race",
  garden: "circles",
  seed: 1,
  stage: "one",
  teams: ["middle", "middle"],
  paces: ["steady", "steady"],
  breaker: 0,
  cuts: [],
  cells: [],
  steps: 0,
  running: false,
  counted: false,
  score: [0, 0, 0, 0],
};

/** Different whole numbers from 0 up to (not including) `below`, at most `most` of them. */
const wholeList = (list: unknown, below: number, most: number): number[] =>
  Array.isArray(list)
    ? [
        ...new Set(
          list.filter(
            (item): item is number => Number.isInteger(item) && item >= 0 && item < below,
          ),
        ),
      ].slice(0, most)
    : [];

const pair = <T>(list: unknown, options: readonly T[], fallback: T): T[] => {
  const items: unknown[] = Array.isArray(list) ? list : [];
  return [oneOf(items[0], options, fallback), oneOf(items[1], options, fallback)];
};

export const mostSteps = ({ game }: Pick<TwoState, "game">) =>
  game === "race" ? RACE_STEPS : MEND_STEPS;

/** A link is kept to a round that can be played: no stage without the choices before it. */
export function parseState(saved: TwoState, initial: TwoState): TwoState {
  const game = oneOf(saved.game, ["race", "mend"] as const, initial.game);
  const cuts = wholeList(saved.cuts, THREADS, CUTS);
  const cells = wholeList(saved.cells, HIDDEN, CELLS);
  let stage = oneOf(saved.stage, STAGES, initial.stage);
  if (game === "mend" && cuts.length < CUTS) stage = "one";
  if (game === "mend" && stage === "play" && cells.length < CELLS) stage = "two";
  const steps =
    stage === "play" && Number.isFinite(saved.steps)
      ? clampWhole(saved.steps, 0, mostSteps({ game }))
      : 0;
  const score = Array.isArray(saved.score) ? saved.score : [];
  return {
    game,
    garden: oneOf(saved.garden, gardensFor(game), "circles"),
    seed: Number.isFinite(saved.seed) ? clampWhole(saved.seed, 1, MOST_SEEDS) : initial.seed,
    stage,
    teams: pair(saved.teams, TEAM_NAMES, "middle"),
    paces: pair(saved.paces, PACE_NAMES, "steady"),
    breaker: saved.breaker === 1 ? 1 : 0,
    cuts,
    cells,
    steps,
    running: false,
    counted: stage === "play" && saved.counted === true,
    score: [0, 1, 2, 3].map((at) =>
      Number.isFinite(score[at]) ? clampWhole(score[at] as number, 0, MOST_SCORE) : 0,
    ),
  };
}

export const twoPlayer: ExperienceSpec<TwoState> = { id: "two-player", initialState, parseState };

/** Who cuts and who repairs. */
export const roles = ({ breaker }: Pick<TwoState, "breaker">) => ({
  breaker: (breaker === 1 ? 1 : 0) as Player,
  repairer: (breaker === 1 ? 0 : 1) as Player,
});

/** The player whose turn it is to choose at this stage, or to take the screen. */
export function playerAt(state: Pick<TwoState, "game" | "stage" | "breaker">): Player {
  const second = state.stage !== "one";
  if (state.game === "race") return second ? 1 : 0;
  const { breaker, repairer } = roles(state);
  return second ? repairer : breaker;
}

/** A round from its start, with whatever is being changed. */
export const newRound = (change: Partial<TwoState>): Partial<TwoState> => ({
  stage: "one",
  cuts: [],
  cells: [],
  steps: 0,
  running: false,
  counted: false,
  ...change,
});

const plant = (name: GameGarden, count: number, seed: number): Point[] =>
  makeDataset(name, { count, noise: NOISE[name], seed, classes: 2, spin: SPIN }).map(roundDot);

export const dotsOf = ({ garden, seed }: Pick<TwoState, "garden" | "seed">) =>
  plant(garden, DOTS, seed);

export type RunState = Pick<
  TwoState,
  "game" | "garden" | "seed" | "stage" | "teams" | "paces" | "cuts" | "cells"
>;

/** What to practise now. The threads are cut once the choice has been handed over. */
export function configOf(state: RunState): LabConfig | null {
  const { game, garden, seed, stage, teams, paces, cuts, cells } = state;
  const shared = {
    dots: dotsOf(state),
    fresh: plant(garden, FRESH_DOTS, seed + FRESH_SEED),
    spots: SPOTS,
    seed,
  };
  if (game === "mend")
    return {
      kind: "mend",
      ...shared,
      cuts: stage === "two" || stage === "play" ? cuts : [],
      cells: stage === "play" ? cells : [],
    };
  if (stage !== "play") return null;
  const racer = (player: Player) => ({
    sizes: TEAMS[teams[player] ?? "middle"],
    rate: PACES[paces[player] ?? "steady"],
  });
  return { kind: "race", ...shared, budget: BUDGETS[garden], racers: [racer(0), racer(1)] };
}

export const runKeyOf = (state: RunState) => {
  const config = configOf(state);
  if (!config) return "";
  const { game, garden, seed, teams, paces } = state;
  return JSON.stringify(
    config.kind === "mend"
      ? [game, garden, seed, config.cuts, config.cells]
      : [game, garden, seed, teams, paces],
  );
};

/** Cells the moment's race teams have, for drawing. */
export const sizesOf = (team: TeamName | undefined): readonly number[] => TEAMS[team ?? "middle"];

export type Winner = Player | "tie";

export function mendWinner(moment: MendMoment, state: Pick<TwoState, "breaker">): Winner | null {
  if (moment.step < MEND_STEPS) return null;
  const { breaker, repairer } = roles(state);
  return moment.right >= MEND_GOAL ? repairer : breaker;
}

export function raceWinner(moment: RaceMoment): Winner | null {
  const result = raceResult(moment);
  return result === null ? null : result === "tie" ? "tie" : result === "first" ? 0 : 1;
}

/** Who has won this round by now, or null while it is still going. */
export function winnerOf(moment: LabMoment | null, state: TwoState): Winner | null {
  if (!moment || state.stage !== "play") return null;
  if (moment.kind === "race") return state.game === "race" ? raceWinner(moment) : null;
  if (moment.kind === "mend") return state.game === "mend" ? mendWinner(moment, state) : null;
  return null;
}

/** The score with this round's win added, once. */
export function counted(state: TwoState, winner: Winner): Partial<TwoState> {
  if (state.counted) return { running: false };
  const at = winner === "tie" ? -1 : winner + (state.game === "race" ? 0 : 2);
  return {
    running: false,
    counted: true,
    score: state.score.map((won, index) => (index === at ? Math.min(MOST_SCORE, won + 1) : won)),
  };
}
