import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how the duel runs, and why the forger can get stuck on one face. */
export function DuelDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.roles}</p>
      <p>{drawer.turns}</p>
      <p>{drawer.collapse}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
