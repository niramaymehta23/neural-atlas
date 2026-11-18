import { SENTENCES, words } from "./captions";

const { drawer } = words;

/** Mechanics and maths for the curious: how the map is drawn, and the sentences it reads. */
export function MapDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <h3 className="font-serif text-lg">{drawer.mechanics}</h3>
      <p>{drawer.places}</p>
      <p>{drawer.pull}</p>
      <p>{drawer.push}</p>
      <p>{drawer.step}</p>
      <h3 className="font-serif text-lg">{drawer.sentences}</h3>
      <p>{drawer.small}</p>
      <ul className="columns-1 gap-4 sm:columns-2">
        {SENTENCES.map((sentence) => (
          <li key={sentence}>{sentence}</li>
        ))}
      </ul>
      <h3 className="font-serif text-lg">{drawer.maths}</h3>
      <p>{drawer.formula}</p>
    </div>
  );
}
