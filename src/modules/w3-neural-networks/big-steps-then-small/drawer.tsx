import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how the ball steps, and why the valley bounces it. */
export function PlanDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.rule}</p>
      <p>{drawer.valley}</p>
      <p>{drawer.sweep}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
