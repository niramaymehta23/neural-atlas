import Link from "next/link";
import { PaperCard } from "@/ui/PaperCard";
import { platformCaptions } from "./captions";
import type { Lesson } from "./contract";

type LockedLessonProps = {
  lesson: Pick<Lesson, "title" | "idea" | "playWith">;
  prerequisites: readonly Pick<Lesson, "id" | "title">[];
};

const words = platformCaptions.locked;
const LINK = "text-accent-ink underline-offset-4 hover:underline";

/** The page an unbuilt lesson shows: its everyday name and idea, and what to try first. */
export function LockedLesson({ lesson, prerequisites }: LockedLessonProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <p className="self-start rounded-pill border border-hairline bg-inset px-3 py-1 text-sm text-ink-soft">
        {words.badge}
      </p>
      <h1 className="text-4xl leading-tight">{lesson.title}</h1>
      <p className="font-serif text-xl text-ink">{lesson.idea}</p>
      <PaperCard className="flex flex-col gap-2">
        <p className="text-sm text-ink-soft">{words.playWith}</p>
        <p>{lesson.playWith}</p>
      </PaperCard>
      <p className="text-ink-soft">{words.note}</p>
      {prerequisites.length > 0 && (
        <nav aria-label={words.first} className="flex flex-col gap-2">
          <p className="text-sm text-ink-soft">{words.first}</p>
          <ul className="flex flex-col gap-1">
            {prerequisites.map(({ id, title }) => (
              <li key={id}>
                <Link href={`/learn/${id}`} className={LINK}>
                  {title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <Link href="/" className={`self-start text-sm ${LINK}`}>
        {words.home}
      </Link>
    </main>
  );
}
