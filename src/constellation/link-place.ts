import { Vector3, type Camera, type Object3D } from "three";

type View = { width: number; height: number };

/**
 * Where a star's link lies over the canvas, in px, held still until the star has moved at least
 * `slack` px from it: moving a link restyles the page, and the drift is slower than a pixel a
 * drawing. (drei's Html writes to the page only when the answer changes.)
 */
export function steadyPlace(slack: number) {
  const spot = new Vector3();
  let held: [number, number] | null = null;
  return (star: Object3D, camera: Camera, { width, height }: View): [number, number] => {
    spot.setFromMatrixPosition(star.matrixWorld).project(camera);
    const x = (spot.x * width + width) / 2;
    const y = (height - spot.y * height) / 2;
    if (!held || Math.hypot(x - held[0], y - held[1]) >= slack) held = [x, y];
    return held;
  };
}

/** A link is a 28 px box with nothing drawn in it: a pixel either way is not seen. */
export const LINK_SLACK = 1;
/** A learned star's link carries its tick, which must sit on the bead. */
export const TICK_SLACK = 0.25;
