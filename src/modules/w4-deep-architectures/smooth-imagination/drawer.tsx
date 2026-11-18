import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how the map is made, and what keeping it tidy does. */
export function MapDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.squeeze}</p>
      <p>{drawer.tidy}</p>
      <p>{drawer.untidy}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
