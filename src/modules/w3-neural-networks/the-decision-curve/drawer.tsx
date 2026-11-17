import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: what a bend does, and why cut-off cells can fall silent. */
export function CurveDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.cells}</p>
      <p>{drawer.straight}</p>
      <p>{drawer.silence}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
