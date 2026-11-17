import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: the cost of a miss, and how strictness changes it. */
export function ScoreDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.cost}</p>
      <p>{drawer.strict}</p>
      <p>{drawer.walk}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
