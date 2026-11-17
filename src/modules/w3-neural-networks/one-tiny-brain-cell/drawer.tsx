import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how one cell weighs its voices. */
export function CellDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.adds}</p>
      <p>{drawer.decides}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
