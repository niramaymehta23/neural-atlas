import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: one trip through the network. */
export function ForwardDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.cell}</p>
      <p>{drawer.flow}</p>
      <p>{drawer.nonsense}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
