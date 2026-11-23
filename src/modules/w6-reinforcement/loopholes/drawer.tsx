import { words } from "./captions";

/** How the robot plans for the reward it is given, and the maths for the curious. */
export function LoopholeDrawer() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      {words.drawer.map((part) => (
        <section key={part.title} className="flex flex-col gap-2">
          <h3 className="font-serif text-lg">{part.title}</h3>
          {part.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
