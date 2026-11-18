import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how the reader carries its memory, and why it fades. */
export function ReadingDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.reading}</p>
      <p>{drawer.bead}</p>
      <p>{drawer.fading}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
