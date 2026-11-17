import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: squared misses and the walk to the best line. */
export function LineDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.misses}</p>
      <p>{drawer.walk}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
