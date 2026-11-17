import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how the fog is cleared, and why one step gives mush. */
export function FogDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.practice}</p>
      <p>{drawer.steps}</p>
      <p>{drawer.giant}</p>
      <p>{drawer.paint}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
