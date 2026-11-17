import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: tiles, pooling inside the AI, and why it loses track. */
export function ZoomDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.tiles}</p>
      <p>{drawer.inside}</p>
      <p>{drawer.shown}</p>
      <p>{drawer.detail}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.max}</p>
      <p>{drawer.average}</p>
    </div>
  );
}
