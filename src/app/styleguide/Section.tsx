import type { ReactNode } from "react";

type SectionProps = { title: string; note?: string; children: ReactNode };

export function Section({ title, note, children }: SectionProps) {
  return (
    <section
      aria-labelledby={`section-${title}`}
      className="flex flex-col gap-5 border-t border-hairline py-10"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`section-${title}`} className="text-2xl">
          {title}
        </h2>
        {note && <p className="max-w-prose text-sm text-ink-soft">{note}</p>}
      </div>
      <div className="flex flex-col items-start gap-5">{children}</div>
    </section>
  );
}
