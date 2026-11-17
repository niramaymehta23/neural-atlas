import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how one move's score is nudged. */
export function ScoringDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.scores}</p>
      <p>{drawer.dials}</p>
      <p>{drawer.treats}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
