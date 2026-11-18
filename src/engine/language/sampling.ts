/**
 * Turning a writer's scores into chances and picking from them. `heat` is temperature: below 1 the
 * likeliest pieces get likelier, above 1 the chances even out, and 0 always takes the likeliest.
 * `choices` keeps only that many of the likeliest pieces (top-k).
 */

export type Sampling = { heat: number; choices?: number };

/** The chances of every piece; they add up to one. */
export function chancesOf(scores: ArrayLike<number>, { heat, choices }: Sampling): Float64Array {
  const count = scores.length;
  const chances = new Float64Array(count);
  if (count === 0) return chances;
  const order = Array.from({ length: count }, (_, at) => at).sort(
    (a, b) => (scores[b] ?? 0) - (scores[a] ?? 0) || a - b,
  );
  const kept = order.slice(0, Math.max(1, Math.min(count, Math.round(choices ?? count))));
  if (heat <= 0) {
    chances[kept[0] ?? 0] = 1;
    return chances;
  }
  const top = scores[kept[0] ?? 0] ?? 0;
  let total = 0;
  for (const at of kept) {
    const value = Math.exp(((scores[at] ?? 0) - top) / heat);
    chances[at] = value;
    total += value;
  }
  for (const at of kept) chances[at] = (chances[at] ?? 0) / total;
  return chances;
}

/** The piece a roll of `roll` (0 to 1) lands on. */
export function pick(chances: ArrayLike<number>, roll: number): number {
  let left = roll;
  let last = 0;
  for (let at = 0; at < chances.length; at += 1) {
    const chance = chances[at] ?? 0;
    if (chance <= 0) continue;
    last = at;
    left -= chance;
    if (left < 0) return at;
  }
  return last;
}

/** The pieces with the biggest chances, biggest first (ties by id), at most `count`. */
export function likeliest(
  chances: ArrayLike<number>,
  count: number,
): { id: number; chance: number }[] {
  return Array.from(chances, (chance, id) => ({ id, chance }))
    .sort((a, b) => b.chance - a.chance || a.id - b.id)
    .slice(0, count);
}
