/**
 * Fills RGBA pixels for a decision field: each cell takes the colour of the group the model
 * prefers, tinted by how sure it is. Pure, so its speed can be tested without a canvas.
 */
export const SURENESS_STEPS = 64;

/**
 * `outputs` holds one chance per cell for two groups (chance of group 1), or `groups` shares per
 * cell. `tables[g]` holds SURENESS_STEPS RGB colours for group g, from unsure to sure.
 */
export function paintField(
  pixels: Uint8ClampedArray,
  outputs: Float32Array,
  groups: number,
  tables: readonly Uint8ClampedArray[],
): void {
  const cells = pixels.length / 4;
  const perCell = outputs.length / cells;
  const floor = 1 / groups;
  const top = SURENESS_STEPS - 1;
  for (let cell = 0; cell < cells; cell += 1) {
    let best = 0;
    let chance: number;
    if (perCell === 1) {
      const one = outputs[cell] ?? 0.5;
      best = one >= 0.5 ? 1 : 0;
      chance = best === 1 ? one : 1 - one;
    } else {
      chance = -1;
      for (let group = 0; group < perCell; group += 1) {
        const share = outputs[cell * perCell + group] ?? 0;
        if (share > chance) {
          chance = share;
          best = group;
        }
      }
    }
    const sureness = Math.max(0, (chance - floor) / (1 - floor));
    const table = tables[best];
    const at = Math.round(sureness * top) * 3;
    const pixel = cell * 4;
    pixels[pixel] = table?.[at] ?? 0;
    pixels[pixel + 1] = table?.[at + 1] ?? 0;
    pixels[pixel + 2] = table?.[at + 2] ?? 0;
    pixels[pixel + 3] = 255;
  }
}
