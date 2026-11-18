import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: the two halves, why the numbers are ordered, speckles. */
export function SqueezeDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.halves}</p>
      <p>{drawer.order}</p>
      <p>{drawer.speckles}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
