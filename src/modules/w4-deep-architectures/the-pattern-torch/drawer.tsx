import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how a torch scores each spot. */
export function TorchDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.sweep}</p>
      <p>{drawer.map}</p>
      <p>{drawer.strict}</p>
      <p>{drawer.many}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
