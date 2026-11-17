import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how told facts become a price guess. */
export function SeesDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.sum}</p>
      <p>{drawer.fit}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
