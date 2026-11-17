"use client";

import Link from "next/link";
import { PaperCard } from "@/ui/PaperCard";
import { platformCaptions } from "./captions";
import type { Lesson } from "./contract";
import { nextSuggested, useProgress } from "./progress/progress";
import { SiteNav } from "./SiteNav";

type LockedLessonProps = {
  lesson: Pick<Lesson, "title" | "idea" | "playWith">;
  prerequisites: readonly Pick<Lesson, "id" | "title">[];
  /** The lessons that are built, as plain data (their loaders stay on the server). */
  built: readonly Pick<Lesson, "id" | "title" | "prerequisites">[];
};

const words = platformCaptions.locked;
const LINK = "text-accent-ink underline-offset-4 hover:underline";

/**
 * The page an unbuilt lesson shows: its everyday name and idea, what to try first, and a built
 * lesson the learner can open right now (the one the map would suggest).
 */
export function LockedLesson({ lesson, prerequisites, built }: LockedLessonProps) {
  const progress = useProgress((saved) => saved);
  const readyId = nextSuggested(
    built.map((entry) => ({ ...entry, load: true })),
    progress,
  );
  const ready = built.find(({ id }) => id === readyId);
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-6">
      <SiteNav current="other" />
      <p className="mt-6 self-start rounded-pill border border-hairline bg-inset px-3 py-1 text-sm text-ink-soft">
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
      {ready && (
        <nav aria-label={words.ready} className="flex flex-col gap-2">
          <p className="text-sm text-ink-soft">{words.ready}</p>
          <Link href={`/learn/${ready.id}`} className={`self-start ${LINK}`}>
            {ready.title}
          </Link>
        </nav>
      )}
    </main>
  );
}
