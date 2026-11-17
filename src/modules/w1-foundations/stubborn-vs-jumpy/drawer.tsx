import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how a robot's curve becomes a dart. */
export function DartsDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.robot}</p>
      <p>{drawer.two}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
