/** A star's bead, in map units. */
export const RADIUS = 0.07;
/** How much a bead swells while its label is open. */
export const BEAD_GROW = 1.3;
/**
 * How finely a bead is cut (around, down). On the whole map a bead is small, so a few sides look
 * round and 74 of them stay cheap to draw. Up close (one group picked, or the camera flying in)
 * it is big enough for its edge to show.
 */
export const BEAD_CUT = { map: [16, 12], close: [24, 16] } as const;
