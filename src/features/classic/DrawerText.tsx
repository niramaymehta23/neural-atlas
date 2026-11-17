/** A lesson's under-the-hood text: a heading and its paragraphs, then the next. */
export function DrawerText({
  sections,
}: {
  sections: readonly { title: string; paragraphs: readonly string[] }[];
}) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h3 className="font-serif text-lg">{section.title}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
