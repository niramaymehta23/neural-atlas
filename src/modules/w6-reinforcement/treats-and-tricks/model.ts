/**
 * Treats and tricks: a puppy knows four tricks and picks one each round from its habits (a
 * gradient-bandit learner, `engine/rl/bandit.ts`). The learner gives a treat or not; a treat
 * makes the trick it just did more likely. Every round's pick comes from a seeded draw for that
 * round, so the treats given (plus the dial changes, in `log`) rebuild the whole run exactly.
 */
import { createTrickLearner, tapeDraw, type TrickLearner } from "@/engine/rl/bandit";
import type { TimelineFrame } from "@/platform/contract";

export const TRICKS = ["sit", "spin", "paw", "roll"] as const;
export type Trick = (typeof TRICKS)[number];
/** The trick you want it to learn. */
export const SIT = 0;
/** Who the trainer gives treats to: one trick, or nobody. */
export const RULES = [...TRICKS, "none"] as const;
export type Rule = (typeof RULES)[number];

/** "How big a treat": how far one treat moves its habits (the step size). */
export const BIG = { min: 0.1, max: 3, start: 1 } as const;
/** "How playful", 0–1 on its dial; see `temperatureOf`. */
export const PLAYFUL = { start: 0.5 } as const;
/** Rounds a run keeps; then a fresh puppy is needed. */
export const MOST_ROUNDS = 200;
/** Rounds the trainer plays per tap. */
export const TRAINER_ROUNDS = 10;
const SEED = 6;

/**
 * "Most of the time": a trick done at least this share of the rounds. The mission and the
 * share words use the same line (QL-16). Measured (treats.test.tsx pins it): at the starting
 * dials, a trainer treating only spins makes the first puppy spin this often after one tap (ten
 * rounds) and each of the first 50 puppies within two taps; with no treats every trick stays at
 * exactly a quarter, whatever the dials.
 */
export const MOST_OF_THE_TIME = 0.5;
/** Rounds with no treat at all before the "never a treat" guess can be told. */
export const NO_TREAT_ROUNDS = 10;

/** Dials 0–1 to the softmax temperature: 0.25 (sticks to its favourite) to 2 (mixes freely). */
export const temperatureOf = (playful: number) => 0.25 * 8 ** Math.min(1, Math.max(0, playful));

/** One dial setting that held for every round before `until` (and after the entry before it). */
export type DialChange = [until: number, big: number, playful: number];

export type TreatsState = {
  /** For each finished round: 1 the puppy got a treat, 0 it did not. */
  treats: number[];
  big: number;
  playful: number;
  /** Earlier dial settings and the round each stopped at; the dials now hold after the last. */
  log: DialChange[];
  /** The trick the trainer treats. */
  rule: Rule;
  /** Which puppy: a fresh puppy starts again with no habits and its own draws. */
  puppy: number;
};

export type TreatsFrame = TimelineFrame & {
  key: string;
  /** How often it does each trick now, in TRICKS order. */
  shares: number[];
  /** The trick it does this round. */
  trick: number;
  /** Treats each trick has earned so far in this run. */
  treated: number[];
  /** Whether the round before this one earned a treat (null before the first). */
  last: { trick: number; treat: boolean } | null;
};

type Dials = Pick<TreatsState, "big" | "playful">;
/** What a run depends on: everything but the trainer's rule. */
export type RunState = Omit<TreatsState, "rule">;

/** What a frame belongs to: a new puppy or any dial change makes a new run. */
export const keyOf = (state: Pick<TreatsState, "puppy" | "big" | "playful" | "log">) =>
  `${state.puppy}|${state.big}|${state.playful}|${state.log.length}`;

const settingsOf = ({ big, playful }: Dials) => ({
  step: big,
  temperature: temperatureOf(playful),
});

/** The dials in force at `round`. */
export function dialsAt(state: Pick<TreatsState, "log" | "big" | "playful">, round: number): Dials {
  const change = state.log.find(([until]) => round < until);
  return change ? { big: change[1], playful: change[2] } : state;
}

/** The log to keep when the dials are about to change after the rounds played so far. */
export function withDials(state: RunState): DialChange[] {
  const round = state.treats.length;
  const lastUntil = state.log.at(-1)?.[0] ?? 0;
  // The old setting picked no finished round: nothing to keep.
  if (round <= lastUntil) return state.log;
  return [...state.log, [round, state.big, state.playful]];
}

/** The draw that picks round `round`'s trick for this puppy. */
const drawFor = (puppy: number, round: number) => tapeDraw(SEED, puppy, round);

/**
 * Every frame of the run `state` describes, round 0 (no treats yet) to the round it is on now.
 * `onEnd` gets the learner as it stands at the newest round (for the trainer).
 */
export function* treatsRun(
  state: RunState,
  onEnd?: (learner: TrickLearner) => void,
): Generator<TreatsFrame> {
  const key = keyOf(state);
  const learner = createTrickLearner(TRICKS.length, settingsOf(dialsAt(state, 0)));
  const treated = TRICKS.map(() => 0);
  let last: TreatsFrame["last"] = null;
  for (let round = 0; round <= state.treats.length; round += 1) {
    learner.configure(settingsOf(dialsAt(state, round)));
    const shares = learner.shares();
    const trick = learner.choose(drawFor(state.puppy, round));
    yield {
      epoch: round,
      loss: 1 - (shares[SIT] ?? 0),
      key,
      shares,
      trick,
      treated: [...treated],
      last,
    };
    if (round === state.treats.length) break;
    const treat = state.treats[round] === 1;
    learner.learn(trick, treat ? 1 : 0);
    if (treat) treated[trick] = (treated[trick] ?? 0) + 1;
    last = { trick, treat };
  }
  onEnd?.(learner);
}

/** The whole run as a list. */
export const framesOf = (state: RunState) => [...treatsRun(state)];

/** The treats after the trainer plays `rounds` more rounds by `rule`, capped at MOST_ROUNDS. */
export function trainerTreats(state: RunState, rule: Rule, rounds = TRAINER_ROUNDS): number[] {
  let learner: TrickLearner | undefined;
  const run = treatsRun(state, (end) => (learner = end));
  while (!run.next().done);
  if (!learner) return state.treats;
  const treats = [...state.treats];
  const wanted = TRICKS.indexOf(rule as Trick);
  while (treats.length < Math.min(MOST_ROUNDS, state.treats.length + rounds)) {
    learner.configure(settingsOf(dialsAt(state, treats.length)));
    const trick = learner.choose(drawFor(state.puppy, treats.length));
    const treat = trick === wanted ? 1 : 0;
    learner.learn(trick, treat);
    treats.push(treat);
  }
  return treats;
}

/** The trick it does most, and how often. */
export function favouriteOf(frame: Pick<TreatsFrame, "shares">) {
  let trick = 0;
  frame.shares.forEach((share, index) => {
    if (share > (frame.shares[trick] ?? 0)) trick = index;
  });
  return { trick, share: frame.shares[trick] ?? 0 };
}

/** The frame on screen is the newest round of the run `state` describes. */
export const isNow = (state: TreatsState, frame: TreatsFrame | undefined): frame is TreatsFrame =>
  frame !== undefined && frame.key === keyOf(state) && frame.epoch === state.treats.length;

/** It does a trick you did not ask for most of the time, one it got treats for. */
export function learnedWrongTrick(frame: TreatsFrame): boolean {
  const { trick, share } = favouriteOf(frame);
  return trick !== SIT && share >= MOST_OF_THE_TIME && (frame.treated[trick] ?? 0) > 0;
}
