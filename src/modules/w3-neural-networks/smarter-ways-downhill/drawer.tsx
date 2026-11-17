import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how each walker steps, and what few examples do. */
export function SmarterDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.steady}</p>
      <p>{drawer.rolling}</p>
      <p>{drawer.careful}</p>
      <p>{drawer.examples}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
