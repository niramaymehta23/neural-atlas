/**
 * A forger and a detective on a flat plane: the forger turns random numbers into points, the
 * detective scores how real a point looks, and each practises against the other (a GAN). The real
 * examples sit around six spots on a ring. Pure and seeded: the same settings give the same duel.
 */
import { createRandom, type Random } from "../random";

/** Where the six real kinds sit, on a ring around the middle of a −1…1 plane. */
export const SPOTS: readonly (readonly [number, number])[] = Array.from(
  { length: 6 },
  (_, index) => {
    const angle = (index / 6) * 2 * Math.PI + Math.PI / 2;
    return [0.65 * Math.cos(angle), 0.65 * Math.sin(angle)] as const;
  },
);
/** How far real examples wander from their spot. */
const SPREAD = 0.05;
/** A forged point this close to a spot counts as drawing that spot's face. */
export const NEAR = 0.2;

type Net = { sizes: readonly number[]; params: Float64Array };

const LEAK = 0.1;
const leaky = (value: number) => (value > 0 ? value : LEAK * value);

function countOf(sizes: readonly number[]) {
  let total = 0;
  for (let layer = 1; layer < sizes.length; layer += 1)
    total += (sizes[layer] ?? 0) * ((sizes[layer - 1] ?? 0) + 1);
  return total;
}

function createNet(sizes: readonly number[], random: Random): Net {
  const params = new Float64Array(countOf(sizes));
  let at = 0;
  for (let layer = 1; layer < sizes.length; layer += 1) {
    const inputs = sizes[layer - 1] ?? 0;
    const scale = Math.sqrt(2 / inputs);
    for (let out = 0; out < (sizes[layer] ?? 0); out += 1) {
      for (let input = 0; input < inputs; input += 1) params[at++] = random.normal() * scale;
      params[at++] = 0;
    }
  }
  return { sizes, params };
}

/** Every layer's outputs (after the bend; the last layer is not bent). */
function forward(net: Net, input: ArrayLike<number>): Float64Array[] {
  const outs: Float64Array[] = [Float64Array.from(input)];
  let at = 0;
  for (let layer = 1; layer < net.sizes.length; layer += 1) {
    const inputs = outs[layer - 1] as Float64Array;
    const size = net.sizes[layer] ?? 0;
    const out = new Float64Array(size);
    const last = layer === net.sizes.length - 1;
    for (let unit = 0; unit < size; unit += 1) {
      let sum = 0;
      for (let index = 0; index < inputs.length; index += 1)
        sum += (net.params[at++] ?? 0) * (inputs[index] ?? 0);
      sum += net.params[at++] ?? 0;
      out[unit] = last ? sum : leaky(sum);
    }
    outs.push(out);
  }
  return outs;
}

/** Adds this example's blame to `grads` and returns the blame on the input. */
function backward(
  net: Net,
  outs: Float64Array[],
  blameOut: ArrayLike<number>,
  grads: Float64Array | null,
): Float64Array {
  const starts: number[] = [];
  let at = 0;
  for (let layer = 1; layer < net.sizes.length; layer += 1) {
    starts.push(at);
    at += (net.sizes[layer] ?? 0) * ((net.sizes[layer - 1] ?? 0) + 1);
  }
  let blame = Float64Array.from(blameOut);
  for (let layer = net.sizes.length - 1; layer >= 1; layer -= 1) {
    const inputs = outs[layer - 1] as Float64Array;
    const out = outs[layer] as Float64Array;
    const last = layer === net.sizes.length - 1;
    if (!last)
      for (let unit = 0; unit < out.length; unit += 1)
        if ((out[unit] ?? 0) < 0) blame[unit] = (blame[unit] ?? 0) * LEAK;
    const before = new Float64Array(inputs.length);
    let index = starts[layer - 1] ?? 0;
    for (let unit = 0; unit < out.length; unit += 1) {
      const b = blame[unit] ?? 0;
      for (let input = 0; input < inputs.length; input += 1) {
        if (grads) grads[index] = (grads[index] ?? 0) + b * (inputs[input] ?? 0);
        before[input] = (before[input] ?? 0) + b * (net.params[index] ?? 0);
        index += 1;
      }
      if (grads) grads[index] = (grads[index] ?? 0) + b;
      index += 1;
    }
    blame = before;
  }
  return blame;
}

type Adam = { m: Float64Array; v: Float64Array; t: number };
const createAdam = (size: number): Adam => ({
  m: new Float64Array(size),
  v: new Float64Array(size),
  t: 0,
});

function adamStep(net: Net, adam: Adam, grads: Float64Array, rate: number) {
  adam.t += 1;
  const fix1 = 1 - 0.5 ** adam.t;
  const fix2 = 1 - 0.999 ** adam.t;
  for (let index = 0; index < grads.length; index += 1) {
    const g = grads[index] ?? 0;
    adam.m[index] = 0.5 * (adam.m[index] ?? 0) + 0.5 * g;
    adam.v[index] = 0.999 * (adam.v[index] ?? 0) + 0.001 * g * g;
    net.params[index] =
      (net.params[index] ?? 0) -
      (rate * ((adam.m[index] ?? 0) / fix1)) / (Math.sqrt((adam.v[index] ?? 0) / fix2) + 1e-8);
  }
}

/** The last layer's outputs. */
const lastOf = (outs: Float64Array[]) => outs[outs.length - 1] ?? new Float64Array(0);
/** The detective's score: its one output. */
const scoreOf = (outs: Float64Array[]) => lastOf(outs)[0] ?? 0;
const finite = (value: number | undefined) =>
  value !== undefined && Number.isFinite(value) ? value : 0;

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));
/** −log(sigmoid(score)), safe for big scores. */
const softplusNeg = (score: number) => Math.max(-score, 0) + Math.log1p(Math.exp(-Math.abs(score)));

export type DuelSettings = {
  /** The forger's step size. */
  forgerRate: number;
  /** The detective's step size. */
  detectiveRate: number;
  /** Forger practice rounds for each detective round. */
  forgerTries: number;
};

export type DuelMoment = {
  round: number;
  /** Forged points (x, y pairs) from the same fixed random numbers every moment. */
  forged: number[];
  /** Share of forged points near each spot, in spot order. */
  shares: number[];
  /** How often the detective was fooled by forged points (0–1) this moment. */
  fooled: number;
  /** How often the detective was right about real and forged points together (0–1). */
  caught: number;
};

const BATCH = 32;
const SHOWN = 120;

/** A real example: one of the six spots, wandering a little. */
function realPoint(random: Random): [number, number] {
  const [x, y] = SPOTS[random.int(SPOTS.length)] ?? [0, 0];
  return [x + random.normal() * SPREAD, y + random.normal() * SPREAD];
}

/** Which spot a point is near, or −1. */
export function spotOf(x: number, y: number): number {
  for (let index = 0; index < SPOTS.length; index += 1) {
    const [sx, sy] = SPOTS[index] ?? [0, 0];
    if (Math.hypot(x - sx, y - sy) < NEAR) return index;
  }
  return -1;
}

/**
 * The duel, moment by moment: `rounds` detective rounds (each followed by `forgerTries` forger
 * rounds), a moment every `every` rounds and at the start.
 */
export function* duel(
  settings: DuelSettings,
  seed: number,
  rounds: number,
  every: number,
): Generator<DuelMoment> {
  const random = createRandom(seed);
  const forger = createNet([2, 24, 24, 2], random);
  const detective = createNet([2, 32, 32, 1], random);
  const forgerAdam = createAdam(forger.params.length);
  const detectiveAdam = createAdam(detective.params.length);
  const shownNoise = Array.from({ length: SHOWN }, () => [random.normal(), random.normal()]);
  const draw = random;
  const forge = (noise: ArrayLike<number>) => forward(forger, noise);

  const moment = (round: number, fooled: number, caught: number): DuelMoment => {
    const forged: number[] = [];
    const counts = new Array<number>(SPOTS.length).fill(0);
    for (const noise of shownNoise) {
      const out = lastOf(forge(noise));
      const x = finite(out[0]);
      const y = finite(out[1]);
      forged.push(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
      const spot = spotOf(x, y);
      if (spot >= 0) counts[spot] = (counts[spot] ?? 0) + 1;
    }
    return {
      round,
      forged,
      shares: counts.map((count) => count / SHOWN),
      fooled,
      caught,
    };
  };

  yield moment(0, 0.5, 0.5);
  let fooledSum = 0;
  let caughtSum = 0;
  let seen = 0;
  for (let round = 1; round <= rounds; round += 1) {
    // The detective looks at real and forged points and learns to tell them apart.
    const detectiveGrads = new Float64Array(detective.params.length);
    for (let index = 0; index < BATCH; index += 1) {
      const real = realPoint(draw);
      const realOuts = forward(detective, real);
      const realScore = scoreOf(realOuts);
      backward(detective, realOuts, [(sigmoid(realScore) - 1) / BATCH], detectiveGrads);
      const fake = lastOf(forge([draw.normal(), draw.normal()]));
      const fakeOuts = forward(detective, fake);
      const fakeScore = scoreOf(fakeOuts);
      backward(detective, fakeOuts, [sigmoid(fakeScore) / BATCH], detectiveGrads);
      caughtSum += (realScore > 0 ? 0.5 : 0) + (fakeScore < 0 ? 0.5 : 0);
      seen += 1;
    }
    adamStep(detective, detectiveAdam, detectiveGrads, settings.detectiveRate);
    // The forger learns to make points the detective calls real.
    for (let tries = 0; tries < settings.forgerTries; tries += 1) {
      const forgerGrads = new Float64Array(forger.params.length);
      for (let index = 0; index < BATCH; index += 1) {
        const forgerOuts = forge([draw.normal(), draw.normal()]);
        const detectiveOuts = forward(detective, lastOf(forgerOuts));
        const score = scoreOf(detectiveOuts);
        if (tries === 0) fooledSum += score > 0 ? 1 : 0;
        const onPoint = backward(detective, detectiveOuts, [(sigmoid(score) - 1) / BATCH], null);
        backward(forger, forgerOuts, onPoint, forgerGrads);
      }
      adamStep(forger, forgerAdam, forgerGrads, settings.forgerRate);
    }
    if (round % every === 0 || round === rounds) {
      const fooled = seen > 0 ? fooledSum / seen : 0;
      const caught = seen > 0 ? caughtSum / seen : 0;
      yield moment(round, fooled, caught);
      fooledSum = 0;
      caughtSum = 0;
      seen = 0;
    }
  }
}

/** Real points to draw behind the duel (seeded, so they never move). */
export function realPoints(count: number, seed = 99): number[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => realPoint(random)).flatMap(([x, y]) => [
    Math.round(x * 1000) / 1000,
    Math.round(y * 1000) / 1000,
  ]);
}

/** How many of the six faces the forger draws: spots holding at least a twelfth of its points. */
export const facesDrawn = (shares: readonly number[]) =>
  shares.filter((share) => share >= 1 / 12).length;

/** The biggest share of forged points on one spot. */
export const biggestShare = (shares: readonly number[]) => Math.max(0, ...shares);

/** Exported for the gradient check in the test. */
export const testing = { createNet, forward, backward, softplusNeg };
