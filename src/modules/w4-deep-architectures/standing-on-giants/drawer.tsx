import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: what the tiny AI learns, and why the big AI helps. */
export function GiantDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.numbers}</p>
      <p>{drawer.tiny}</p>
      <p>{drawer.test}</p>
      <p>{drawer.giant}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
      <p>{drawer.learning}</p>
    </div>
  );
}
