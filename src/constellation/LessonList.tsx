import Link from "next/link";
import { lessons, worlds } from "@/catalog";
import { constellationCaptions as captions } from "./captions";
import type { ExtraStar } from "./ExtraStars";
import { starStatus, statusWords } from "./status";

type LessonListProps = {
  learned: ReadonlySet<string>;
  suggested: string | null;
  /** Stars earned beyond the ideas. */
  extras?: readonly ExtraStar[];
  className?: string;
};

/**
 * Every idea as a plain list, group by group. It is the map before the 3D arrives (and for
 * readers without scripts or crawlers), and stands in for it where 3D cannot run.
 */
export function LessonList({ learned, suggested, extras = [], className = "" }: LessonListProps) {
  return (
    <nav
      aria-label={captions.list}
      className={`grid gap-8 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {worlds.map(({ world, title }) => (
        <section key={world} aria-labelledby={`world-${world}`} className="flex flex-col gap-2">
          <h2 id={`world-${world}`} className="font-serif text-xl">
            {title}
          </h2>
          <ul className="flex flex-col gap-1">
            {lessons
              .filter((lesson) => lesson.world === world)
              .map(({ id, title: name, load }) => {
                const status = starStatus({
                  learned: learned.has(id),
                  suggested: id === suggested,
                  built: Boolean(load),
                });
                const words = statusWords(status);
                return (
                  <li key={id} data-status={status ?? undefined}>
                    <Link
                      href={`/learn/${id}`}
                      prefetch={false}
                      className={`underline-offset-4 hover:underline ${status === "next" ? "text-accent-ink" : "text-ink"}`}
                    >
                      {name}
                    </Link>
                    {words && <span className="text-sm text-ink-soft"> · {words}</span>}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      {extras.length > 0 && (
        <section aria-labelledby="extra-stars" className="flex flex-col gap-2">
          <h2 id="extra-stars" className="font-serif text-xl">
            {captions.extras}
          </h2>
          <ul className="flex flex-col gap-1">
            {extras.map(({ id, title, href, mark }) => (
              <li key={id} data-achievement={id} className="flex items-center gap-2">
                <span aria-hidden className="size-4 shrink-0">
                  {mark}
                </span>
                <Link
                  href={href}
                  prefetch={false}
                  className="text-ink underline-offset-4 hover:underline"
                >
                  {title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </nav>
  );
}
