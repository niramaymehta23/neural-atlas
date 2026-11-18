import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: layers of torches, and how the smudge is made. */
export function SeeDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.layers}</p>
      <p>{drawer.shrink}</p>
      <p>{drawer.end}</p>
      <p>{drawer.smudge}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.layer}</p>
      <p>{drawer.smudgeMaths}</p>
      <p className="text-ink-soft">{drawer.model}</p>
    </div>
  );
}
