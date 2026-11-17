/**
 * Learning from friends: sixteen people in two friend groups, joined by a couple of friendships.
 * A few wear their club's badge; everyone else starts with no view. Each round of passing
 * messages, everyone mixes in what their friends think. A few rounds let the badges' views spread
 * through each group; too many and the whole network blends into one view.
 */

export type FriendsState = {
  /** "How much they listen to friends", 0–1. */
  listen: number;
  /** "How many rounds" of passing messages. */
  rounds: number;
};

export const PEOPLE = 16;
export const ROUNDS = { min: 0, max: 40 };
/** Each club's half of the network: people 0–7 are in club 0, 8–15 in club 1. */
export const clubOf = (person: number) => (person < PEOPLE / 2 ? 0 : 1);
/** People who wear their club's badge, so their view starts sure. */
export const BADGES = [0, 5, 10, 13] as const;
/** Views closer together than this count as everyone thinking the same. */
export const SAME = 0.05;
/** A view this close to zero is no view at all. */
const UNSURE = 0.01;

/** Friendships: within each group a ring plus a skip, and two friendships across. */
export const FRIENDSHIPS: readonly (readonly [number, number])[] = (() => {
  const pairs: [number, number][] = [];
  for (const start of [0, 8]) {
    for (let index = 0; index < 8; index += 1) {
      pairs.push([start + index, start + ((index + 1) % 8)]);
      if (index % 2 === 0) pairs.push([start + index, start + ((index + 2) % 8)]);
    }
  }
  pairs.push([3, 12], [6, 9], [1, 14]);
  return pairs;
})();

const FRIENDS: readonly number[][] = Array.from({ length: PEOPLE }, (_, person) =>
  FRIENDSHIPS.flatMap(([a, b]) => (a === person ? [b] : b === person ? [a] : [])),
);

export const friendsOf = (person: number) => FRIENDS[person] ?? [];

/** Starting views: +1 for a club 0 badge, −1 for a club 1 badge, 0 (no view) for everyone else. */
export function startingViews(): number[] {
  return Array.from({ length: PEOPLE }, (_, person) =>
    (BADGES as readonly number[]).includes(person) ? (clubOf(person) === 0 ? 1 : -1) : 0,
  );
}

/** One round: everyone keeps part of their own view and mixes in their friends' average. */
export function passMessages(views: readonly number[], listen: number): number[] {
  return views.map((own, person) => {
    const friends = friendsOf(person);
    if (friends.length === 0) return own;
    const heard = friends.reduce((sum, friend) => sum + (views[friend] ?? 0), 0) / friends.length;
    return (1 - listen) * own + listen * heard;
  });
}

/** Everyone's view after `rounds` rounds at `listen`. */
export function viewsAfter(listen: number, rounds: number): number[] {
  let views = startingViews();
  for (let round = 0; round < rounds; round += 1) views = passMessages(views, listen);
  return views;
}

/** The club a view leans to, or null for no view. */
export const leanOf = (view: number): 0 | 1 | null =>
  Math.abs(view) < UNSURE ? null : view > 0 ? 0 : 1;

/** How far apart the views are: the biggest minus the smallest. */
export const spreadOf = (views: readonly number[]) => Math.max(...views) - Math.min(...views);

/** True when everyone thinks (almost) exactly the same. */
export const allSame = (views: readonly number[]) => spreadOf(views) < SAME;

/** Of the people without a badge, how many lean to their own club. */
export function rightGuesses(views: readonly number[]): number {
  let right = 0;
  views.forEach((view, person) => {
    if ((BADGES as readonly number[]).includes(person)) return;
    if (leanOf(view) === clubOf(person)) right += 1;
  });
  return right;
}

export const UNBADGED = PEOPLE - BADGES.length;
