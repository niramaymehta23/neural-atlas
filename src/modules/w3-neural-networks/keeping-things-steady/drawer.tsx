import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: why deep signals fade, and how calming stops it. */
export function SteadyDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.fade}</p>
      <p>{drawer.blame}</p>
      <p>{drawer.calm}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
