import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: one round of passing messages, and why too many blend. */
export function FriendsDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.mixing}</p>
      <p>{drawer.spreading}</p>
      <p>{drawer.blending}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
