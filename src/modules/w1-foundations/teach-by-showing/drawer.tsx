import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: what the robot sees and how it picks a basket. */
export function TeachDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.facts}</p>
      <p>{drawer.average}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.distance}</p>
    </div>
  );
}
