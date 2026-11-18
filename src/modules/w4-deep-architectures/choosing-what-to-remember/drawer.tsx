import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: the store, its three gates, and why they reach back far. */
export function GatesDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.store}</p>
      <p>{drawer.learning}</p>
      <p>{drawer.reach}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
