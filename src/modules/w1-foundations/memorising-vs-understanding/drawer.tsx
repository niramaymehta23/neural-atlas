import { words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: what the student is and what practising changes. */
export function StudyDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.student}</p>
      <p>{drawer.practice}</p>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
