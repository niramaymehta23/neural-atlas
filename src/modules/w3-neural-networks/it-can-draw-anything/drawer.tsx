import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how a row of bends can copy any squiggle. */
export function DrawDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.cells}</p>
      <p>{drawer.enough}</p>
      <p>{drawer.few}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
