import { multiplied } from "../multiplications";
import type { Dot } from "./types";

export type Neighbour = { index: number; distance: number; weight: number };
export type Vote = {
  /** The k nearest dots, nearest first (ties by index). */
  neighbours: Neighbour[];
  /** Total voting weight per group. */
  votes: number[];
  /** Each group's share of the vote. */
  shares: number[];
  /** The winning group: most weight; a tie goes to the group of the nearest tied voter. */
  winner: number;
};

/** Distances below this count as this far, so a dot exactly on a voter has a finite voice. */
const NEAREST = 0.02;

/**
 * The `k` nearest dots, nearest first (ties by index). It keeps the best so far in order instead
 * of sorting every dot: a picture asks this for thousands of spots.
 */
function nearest(dots: readonly Dot[], x: number, y: number, k: number) {
  const best: { index: number; distance: number }[] = [];
  if (k === 0) return best;
  // The exact distance is slow to work out, so only dots that may be among the best get it.
  let worthIt = Infinity;
  for (let index = 0; index < dots.length; index += 1) {
    const dot = dots[index];
    if (!dot) continue;
    const dx = dot.x - x;
    const dy = dot.y - y;
    if (dx * dx + dy * dy > worthIt) continue;
    const distance = Math.hypot(dx, dy);
    let at = best.length;
    while (at > 0 && (best[at - 1]?.distance ?? 0) > distance) at -= 1;
    if (at >= k) continue;
    best.splice(at, 0, { index, distance });
    if (best.length > k) best.pop();
    if (best.length === k) worthIt = (best[k - 1]?.distance ?? Infinity) ** 2 * (1 + 1e-9);
  }
  return best;
}

/**
 * Asks the `k` nearest dots to vote on the group of the spot (x, y). `closeness` 0 gives every
 * neighbour one vote; at 1 a neighbour's vote is one over its distance squared (in between, a
 * power of it), so nearer neighbours count more.
 */
export function vote(
  dots: readonly Dot[],
  x: number,
  y: number,
  k: number,
  closeness = 0,
  groups = 2,
): Vote {
  // Two squares per distance.
  multiplied(2 * dots.length);
  const neighbours = nearest(dots, x, y, Math.max(0, Math.floor(k))).map(({ index, distance }) => ({
    index,
    distance,
    weight: closeness === 0 ? 1 : Math.max(distance, NEAREST) ** (-2 * closeness),
  }));
  const votes = Array.from({ length: groups }, () => 0);
  for (const near of neighbours) {
    const group = dots[near.index]?.label ?? 0;
    votes[group] = (votes[group] ?? 0) + near.weight;
  }
  const total = votes.reduce((sum, value) => sum + value, 0);
  const shares = votes.map((value) => (total > 0 ? value / total : 1 / groups));
  const most = Math.max(...votes);
  const tied = new Set(votes.flatMap((value, group) => (value === most ? [group] : [])));
  const first = neighbours.find((near) => tied.has(dots[near.index]?.label ?? -1));
  const winner = first ? (dots[first.index]?.label ?? 0) : 0;
  return { neighbours, votes, shares, winner };
}

/** A classifier for fields: each spot's shares, with the tie rule folded into the winner. */
export function knnClassifier(dots: readonly Dot[], k: number, closeness = 0, groups = 2) {
  return (x: number, y: number): number[] => {
    const result = vote(dots, x, y, k, closeness, groups);
    // A dead heat is broken by the nearest voter: nudge its group so the field agrees.
    const nudged = [...result.shares];
    nudged[result.winner] = (nudged[result.winner] ?? 0) + 1e-9;
    return nudged;
  };
}
