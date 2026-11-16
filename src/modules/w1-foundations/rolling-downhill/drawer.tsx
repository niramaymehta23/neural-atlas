import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how each walker steps, and why huge steps fly off. */
export function DownhillDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.steady}</p>
      <p>{drawer.rolling}</p>
      <p>{drawer.careful}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.bound}</p>
    </div>
  );
}
