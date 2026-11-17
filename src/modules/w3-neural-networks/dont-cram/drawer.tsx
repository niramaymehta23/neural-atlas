import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how cells are switched off, and why it helps. */
export function CramDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.off}</p>
      <p>{drawer.why}</p>
      <p>{drawer.test}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
