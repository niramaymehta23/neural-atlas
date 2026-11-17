import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how a score becomes a chance. */
export function SureDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.score}</p>
      <p>{drawer.chance}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
