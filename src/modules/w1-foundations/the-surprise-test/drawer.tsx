import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: why hidden questions give an honest score. */
export function SurpriseDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.split}</p>
      <p>{drawer.peek}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
