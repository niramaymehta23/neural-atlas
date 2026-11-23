import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how a habit is nudged, and why huge nudges lock it. */
export function HabitDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.habits}</p>
      <p>{drawer.nudges}</p>
      <p>{drawer.batch}</p>
      <p>{drawer.wild}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
