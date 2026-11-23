import { words } from "./captions";

/** How the chatbot is trained against the judge, and the maths for the curious. */
export function ChatDrawer() {
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
