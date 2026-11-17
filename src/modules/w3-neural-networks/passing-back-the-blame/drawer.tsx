import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how blame travels back, and why it can dry up. */
export function BlameDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.back}</p>
      <p>{drawer.squash}</p>
      <p>{drawer.leaky}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
