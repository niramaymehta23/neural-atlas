/** The edges of a box on screen, in px (a DOMRect fits). */
export type Edges = { left: number; right: number; top: number; bottom: number };

/** Space kept between a label and the edge of the map. */
export const EDGE_GAP = 8;
/** How far below its usual spot a label drops when there is no room above the star. */
export const DROP_GAP = 48;

/**
 * Where to slide a star's label so it stays inside the map: sideways off the left or right
 * edge, and below the star when it would poke out of the top. `natural` is where the label sits
 * unshifted.
 */
export function labelShift(natural: Edges, bounds: Edges): { x: number; y: number } {
  let x = 0;
  if (natural.left < bounds.left + EDGE_GAP) x = bounds.left + EDGE_GAP - natural.left;
  else if (natural.right > bounds.right - EDGE_GAP) x = bounds.right - EDGE_GAP - natural.right;
  const height = natural.bottom - natural.top;
  const y = natural.top < bounds.top + EDGE_GAP ? height + DROP_GAP : 0;
  return { x, y };
}

/**
 * Re-measures a label and shifts its outer box so the inner card stays inside `bounds`. The
 * shift already applied is undone first, so calling it every frame never drifts.
 */
export function keepInside(outer: HTMLElement, card: HTMLElement, bounds: Edges): void {
  const applied = { x: Number(outer.dataset.x ?? 0), y: Number(outer.dataset.y ?? 0) };
  const box = card.getBoundingClientRect();
  const natural = {
    left: box.left - applied.x,
    right: box.right - applied.x,
    top: box.top - applied.y,
    bottom: box.bottom - applied.y,
  };
  const { x, y } = labelShift(natural, bounds);
  if (x === applied.x && y === applied.y) return;
  outer.dataset.x = `${x}`;
  outer.dataset.y = `${y}`;
  outer.style.transform = `translate(${x}px, ${y}px)`;
}
