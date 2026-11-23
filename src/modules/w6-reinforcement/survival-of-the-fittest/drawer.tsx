import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how the cars drive, race and breed. */
export function RaceDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.brains}</p>
      <p>{drawer.races}</p>
      <p>{drawer.breeding}</p>
      <p>{drawer.wild}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
