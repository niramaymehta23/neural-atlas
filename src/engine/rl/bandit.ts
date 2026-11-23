/**
 * Choosing among a few options whose payoffs are hidden, learnt only by trying them.
 *
 * - Slot machines ("bandits"): each pays out with its own hidden chance. A machine's outcomes
 *   are a fixed tape, one draw per pull number (`pays`), so a player, a bot or a replayed link
 *   meets the same machine. Three players: one that picks at random, one that mostly plays its
 *   best-so-far machine and now and then a random one (epsilon-greedy), and one that adds an
 *   "unknown bonus" to machines it has tried little (UCB1).
 * - A trick learner (gradient bandit): a preference per trick, turned into chances by softmax
 *   with a temperature; a reward above its running average nudges the trick it just did up and
 *   every other trick down, a reward below it does the opposite.
 *
 * Pure and seeded: the same seed and the same choices give the same run, bit for bit.
 */
import { createRandom, type Random } from "../random";

/** A whole-number hash of a few numbers (FNV-1a over their 32-bit words), for seeding tapes. */
export function mixSeed(...parts: number[]): number {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    let word = part >>> 0;
    for (let byte = 0; byte < 4; byte += 1) {
      hash ^= word & 0xff;
      hash = Math.imul(hash, 0x01000193) >>> 0;
      word >>>= 8;
    }
  }
  return hash >>> 0;
}

/** The draw behind pull number `pull` (0 = first) of `machine` on tape `tape`, uniform in [0, 1). */
export const tapeDraw = (tape: number, machine: number, pull: number) =>
  createRandom(mixSeed(tape, machine, pull)).next();

/** Whether pull number `pull` of a machine with win chance `chance` pays out, on tape `tape`. */
export const pays = (chance: number, tape: number, machine: number, pull: number) =>
  tapeDraw(tape, machine, pull) < chance;

/** `values` in an order fixed by `seed` (Fisher–Yates). */
export function shuffled<T>(values: readonly T[], seed: number): T[] {
  const random = createRandom(seed);
  const out = [...values];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const other = random.int(index + 1);
    [out[index], out[other]] = [out[other] as T, out[index] as T];
  }
  return out;
}

/** The index of the largest value; ties go to the first. */
export function bestIndex(values: readonly number[]): number {
  let best = 0;
  values.forEach((value, index) => {
    if (value > (values[best] ?? -Infinity)) best = index;
  });
  return best;
}

export type BanditPlayerKind =
  | { kind: "random" }
  /** `curiosity`: the chance (0–1) of a random machine instead of the best so far. */
  | { kind: "curious"; curiosity: number }
  /** `hope`: how big the bonus for little-tried machines is (UCB1's c; √2 is the classic). */
  | { kind: "hopeful"; hope?: number };

export type BanditPlayer = {
  /** The machine it pulls next. */
  choose(): number;
  /** Tells it what a pull paid (1 or 0). */
  learn(machine: number, reward: number): void;
  /** Pulls per machine so far. */
  readonly counts: readonly number[];
  /** Wins per machine so far. */
  readonly wins: readonly number[];
};

/** Its average payout per machine so far (0 for a machine never pulled). */
export const averages = (player: Pick<BanditPlayer, "counts" | "wins">) =>
  player.counts.map((pulls, machine) => (pulls === 0 ? 0 : (player.wins[machine] ?? 0) / pulls));

/** Among the machines whose score is (within a hair of) the highest, one at random. */
function pickTop(scores: readonly number[], random: Random): number {
  const top = Math.max(...scores);
  const tied = scores.flatMap((score, machine) => (score >= top - 1e-12 ? [machine] : []));
  return tied[random.int(tied.length)] ?? 0;
}

/**
 * A player of `machines` slot machines. Ties are broken at random from its own seeded random,
 * so a curious player with no curiosity sticks with whichever machine paid first.
 */
export function createBanditPlayer(
  kind: BanditPlayerKind,
  machines: number,
  seed: number,
): BanditPlayer {
  const random = createRandom(seed);
  const counts = new Array<number>(machines).fill(0);
  const wins = new Array<number>(machines).fill(0);
  const total = () => counts.reduce((sum, pulls) => sum + pulls, 0);
  const choose = () => {
    if (kind.kind === "random") return random.int(machines);
    if (kind.kind === "curious") {
      if (random.next() < kind.curiosity) return random.int(machines);
      return pickTop(averages({ counts, wins }), random);
    }
    // Hopeful: every machine once, then the best average plus a bonus that shrinks with pulls.
    const untried = counts.indexOf(0);
    if (untried >= 0) return untried;
    const hope = kind.hope ?? Math.SQRT2;
    const log = Math.log(total());
    return pickTop(
      counts.map((pulls, machine) => (wins[machine] ?? 0) / pulls + hope * Math.sqrt(log / pulls)),
      random,
    );
  };
  return {
    choose,
    learn(machine, reward) {
      counts[machine] = (counts[machine] ?? 0) + 1;
      wins[machine] = (wins[machine] ?? 0) + reward;
    },
    counts,
    wins,
  };
}

/** One pull of a race: which machine, and whether it paid. */
export type Pull = { machine: number; won: boolean };

/**
 * A player's pulls on machines with these `chances`, one at a time (lazily), each machine
 * paying from its own tape so every player meets the same machines.
 */
export function* playMachines(
  player: BanditPlayer,
  chances: readonly number[],
  tape: number,
  pulls: number,
): Generator<Pull> {
  for (let at = 0; at < pulls; at += 1) {
    const machine = player.choose();
    const won = pays(chances[machine] ?? 0, tape, machine, player.counts[machine] ?? 0);
    player.learn(machine, won ? 1 : 0);
    yield { machine, won };
  }
}

/** Total wins of a fresh player of `kind` over `pulls` pulls. */
export function winsOf(
  kind: BanditPlayerKind,
  chances: readonly number[],
  { tape, seed, pulls }: { tape: number; seed: number; pulls: number },
): number {
  let wins = 0;
  const player = createBanditPlayer(kind, chances.length, seed);
  for (const pull of playMachines(player, chances, tape, pulls)) if (pull.won) wins += 1;
  return wins;
}

/** Chances from preferences: softmax of preference ÷ temperature (higher: more even). */
export function softmax(preferences: readonly number[], temperature: number): number[] {
  const scaled = preferences.map((preference) => preference / Math.max(1e-6, temperature));
  const top = Math.max(...scaled);
  const weights = scaled.map((value) => Math.exp(value - top));
  const sum = weights.reduce((total, weight) => total + weight, 0);
  return weights.map((weight) => weight / sum);
}

/** The option whose share of [0, 1) holds `draw` (the last one for rounding leftovers). */
export function drawFrom(shares: readonly number[], draw: number): number {
  let edge = 0;
  for (let index = 0; index < shares.length; index += 1) {
    edge += shares[index] ?? 0;
    if (draw < edge) return index;
  }
  return shares.length - 1;
}

export type TrickLearnerSettings = {
  /** How far one reward moves the preferences (the gradient bandit's step size, alpha). */
  step: number;
  /** Softmax temperature: low sticks to the favourite, high mixes the tricks evenly. */
  temperature: number;
};

export type TrickLearner = {
  readonly preferences: readonly number[];
  /** The running average of every reward so far (0 before the first). */
  readonly baseline: number;
  readonly rounds: number;
  /** How often it does each trick now. */
  shares(): number[];
  /** The trick a draw in [0, 1) picks now. */
  choose(draw: number): number;
  /** Learns from the reward (0 or 1) for `trick`. */
  learn(trick: number, reward: number): void;
  configure(settings: TrickLearnerSettings): void;
};

/**
 * A gradient-bandit learner over `tricks` options, starting with no preference. A reward is
 * compared with the average of the rewards before it: above it the trick done is nudged up (and
 * the rest down), below it the opposite. With no rewards at all nothing ever moves.
 */
export function createTrickLearner(tricks: number, settings: TrickLearnerSettings): TrickLearner {
  const preferences = new Array<number>(tricks).fill(0);
  let { step, temperature } = settings;
  let baseline = 0;
  let rounds = 0;
  const shares = () => softmax(preferences, temperature);
  return {
    preferences,
    get baseline() {
      return baseline;
    },
    get rounds() {
      return rounds;
    },
    shares,
    choose: (draw) => drawFrom(shares(), draw),
    learn(trick, reward) {
      const now = shares();
      const surprise = reward - baseline;
      for (let index = 0; index < tricks; index += 1) {
        const share = now[index] ?? 0;
        preferences[index] =
          (preferences[index] ?? 0) + step * surprise * ((index === trick ? 1 : 0) - share);
      }
      rounds += 1;
      baseline += (reward - baseline) / rounds;
    },
    configure(next) {
      ({ step, temperature } = next);
    },
  };
}
