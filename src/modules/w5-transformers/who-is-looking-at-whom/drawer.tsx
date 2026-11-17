import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: questions, answers, readers and passes. */
export function LookingDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.match}</p>
      <p>{drawer.readers}</p>
      <p>{drawer.model}</p>
      <p className="text-ink-soft" data-credit>
        {drawer.credit}
      </p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
