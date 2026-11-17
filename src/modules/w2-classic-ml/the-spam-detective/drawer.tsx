import { DrawerText } from "@/features/classic/DrawerText";
import { examples, words } from "./captions";

const { drawer } = words;

/** How the clues are counted and added, the maths, and the old messages it learned from. */
export function SpamDrawer() {
  return (
    <>
      <DrawerText
        sections={[
          {
            title: drawer.mechanics,
            paragraphs: [drawer.count, drawer.clue, drawer.add, drawer.careful],
          },
          { title: drawer.maths, paragraphs: [drawer.formula] },
        ]}
      />
      <h3 className="mt-4 font-serif text-lg">{words.learned}</h3>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {examples.map((example) => (
          <li key={example.text}>
            <span className="text-ink-soft">{example.spam ? words.spamTag : words.normalTag}</span>{" "}
            {example.text}
          </li>
        ))}
      </ul>
    </>
  );
}
