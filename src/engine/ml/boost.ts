import { multiplied } from "../multiplications";
import type { Dot } from "./types";

/** A small regression tree: each box holds a nudge to the running score. */
export type Nudge =
  | { kind: "leaf"; value: number }
  | { kind: "split"; feature: 0 | 1; threshold: number; low: Nudge; high: Nudge };

export type Relay = {
  /** The starting score (log-odds of group 1 across the garden). */
  base: number;
  /** Each runner's tree, already scaled by how hard it pushes. */
  runners: Nudge[];
};

export type RelayOptions = {
  runners: number;
  /** Questions each runner may ask (tree depth, at least 1). */
  depth: number;
  /** How hard each runner pushes: the learning rate, 0–1. */
  rate: number;
  minLeaf?: number;
};

/** Keeps a leaf's nudge finite when its dots are all already sure (Newton step damping). */
const DAMPING = 1;
const BETTER = 1e-12;

export const sigmoid = (score: number) => 1 / (1 + Math.exp(-score));

const valueOf = (dot: Dot, feature: 0 | 1) => (feature === 0 ? dot.x : dot.y);

/**
 * One runner: a regression tree fitted by Newton steps on log-loss. `pull` is how far each dot's
 * chance is from its group (label − chance); `sureness` is chance × (1 − chance). A split is kept
 * when it raises G²/(H+λ) summed over the boxes; a leaf's nudge is G/(H+λ).
 */
function fitRunner(
  dots: readonly Dot[],
  pull: readonly number[],
  sureness: readonly number[],
  depth: number,
  minLeaf: number,
): Nudge {
  const grow = (indices: readonly number[], left: number): Nudge => {
    let g = 0;
    let h = 0;
    for (const index of indices) {
      g += pull[index] ?? 0;
      h += sureness[index] ?? 0;
    }
    const leaf: Nudge = { kind: "leaf", value: g / (h + DAMPING) };
    if (left <= 0 || indices.length < 2 * minLeaf) return leaf;
    const whole = (g * g) / (h + DAMPING);
    let best: { feature: 0 | 1; threshold: number; gain: number } | null = null;
    for (const feature of [0, 1] as const) {
      const sorted = [...indices].sort(
        (a, b) => valueOf(dots[a] as Dot, feature) - valueOf(dots[b] as Dot, feature) || a - b,
      );
      let gl = 0;
      let hl = 0;
      for (let at = 0; at < sorted.length - 1; at += 1) {
        const index = sorted[at] as number;
        gl += pull[index] ?? 0;
        hl += sureness[index] ?? 0;
        const here = valueOf(dots[index] as Dot, feature);
        const next = valueOf(dots[sorted[at + 1] as number] as Dot, feature);
        const count = at + 1;
        if (next === here || count < minLeaf || sorted.length - count < minLeaf) continue;
        multiplied(2);
        const gr = g - gl;
        const hr = h - hl;
        const gain = (gl * gl) / (hl + DAMPING) + (gr * gr) / (hr + DAMPING) - whole;
        if (gain > BETTER && (!best || gain > best.gain + BETTER))
          best = { feature, threshold: (here + next) / 2, gain };
      }
    }
    if (!best) return leaf;
    const { feature, threshold } = best;
    return {
      kind: "split",
      feature,
      threshold,
      low: grow(
        indices.filter((index) => valueOf(dots[index] as Dot, feature) <= threshold),
        left - 1,
      ),
      high: grow(
        indices.filter((index) => valueOf(dots[index] as Dot, feature) > threshold),
        left - 1,
      ),
    };
  };
  return grow(
    dots.map((_, index) => index),
    depth,
  );
}

const scale = (nudge: Nudge, by: number): Nudge =>
  nudge.kind === "leaf"
    ? { kind: "leaf", value: nudge.value * by }
    : { ...nudge, low: scale(nudge.low, by), high: scale(nudge.high, by) };

export function nudgeAt(nudge: Nudge, x: number, y: number): number {
  let node = nudge;
  while (node.kind === "split")
    node = (node.feature === 0 ? x : y) <= node.threshold ? node.low : node.high;
  return node.value;
}

/**
 * Gradient boosting for two groups: runners one after another, each chasing what the team so far
 * still gets wrong.
 */
export function runRelay(dots: readonly Dot[], options: RelayOptions): Relay {
  const { runners, depth, rate, minLeaf = 1 } = options;
  const ones = dots.filter((dot) => dot.label === 1).length;
  // The base rate, kept away from 0 and 1 so an all-one-group garden still has a finite start.
  const share = (ones + 0.5) / (dots.length + 1);
  const base = Math.log(share / (1 - share));
  const scores = dots.map(() => base);
  const team: Nudge[] = [];
  for (let runner = 0; runner < runners; runner += 1) {
    const chances = scores.map(sigmoid);
    const pull = dots.map((dot, index) => dot.label - (chances[index] ?? 0.5));
    multiplied(chances.length);
    const sureness = chances.map((chance) => chance * (1 - chance));
    const nudge = scale(fitRunner(dots, pull, sureness, Math.max(1, depth), minLeaf), rate);
    team.push(nudge);
    dots.forEach((dot, index) => {
      scores[index] = (scores[index] ?? 0) + nudgeAt(nudge, dot.x, dot.y);
    });
  }
  return { base, runners: team };
}

/** The team's score at a spot using only the first `upTo` runners. */
export function relayScore(
  relay: Relay,
  x: number,
  y: number,
  upTo = relay.runners.length,
): number {
  let score = relay.base;
  const last = Math.min(upTo, relay.runners.length);
  for (let runner = 0; runner < last; runner += 1)
    score += nudgeAt(relay.runners[runner] as Nudge, x, y);
  return score;
}

export const relayClassifier =
  (relay: Relay, upTo = relay.runners.length) =>
  (x: number, y: number) => {
    const chance = sigmoid(relayScore(relay, x, y, upTo));
    return [1 - chance, chance];
  };
