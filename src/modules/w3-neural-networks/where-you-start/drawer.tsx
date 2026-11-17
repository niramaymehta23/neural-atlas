import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: where the starting guesses come from, and the trap. */
export function StartDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.start}</p>
      <p>{drawer.luck}</p>
      <p>{drawer.same}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
