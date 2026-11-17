import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how one straight fence scores and learns. */
export function SplitDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.score}</p>
      <p>{drawer.learning}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
