"use client";

import Link from "next/link";
import { lessons, worlds } from "@/catalog";
import { SiteNav } from "@/platform/SiteNav";
import { useProgress } from "@/platform/progress/progress";
import { useIdeaCard } from "@/ui/glossary/idea-cards";
import { achievements, earnedAchievements } from "../achievements/achievements";
import { AchievementMark } from "../achievements/AchievementMark";
import { achievementCaptions } from "../achievements/captions";
import { glossaryCaptions } from "../glossary/captions";
import { BUTTON, LINK, MAIN_BUTTON } from "../shell/buttons";
import { pages } from "../shell/captions";
import { exploreCaptions as words } from "./captions";

const THINGS = [
  pages.sandbox,
  pages.journeys,
  pages.museum,
  pages.theatre,
  pages.twoPlayer,
  { path: "/puzzle", ...words.puzzle },
];

/** Everything there is to do beyond the lessons: the experiences, your stars, every idea's card. */
export function ExplorePage() {
  const progress = useProgress((saved) => saved);
  const openCard = useIdeaCard();
  const earned = earnedAchievements(progress);
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-6">
        <SiteNav current="explore" />
        <header className="flex flex-col gap-3">
          <h1 tabIndex={-1} className="text-4xl leading-tight outline-none md:text-5xl">
            {pages.explore.title}
          </h1>
          <p className="max-w-prose text-lg text-ink-soft">{pages.explore.opening}</p>
        </header>
      </div>
      <ul aria-label={words.things} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {THINGS.map(({ path, title, card }) => (
          <li
            key={path}
            className="flex flex-col items-start gap-3 rounded-card border border-hairline bg-card p-6"
          >
            <h2 className="text-2xl">{title}</h2>
            <p className="grow text-ink-soft">{card}</p>
            <Link
              href={path}
              aria-label={words.open(title)}
              className={`inline-flex items-center justify-center ${MAIN_BUTTON}`}
            >
              {words.go}
            </Link>
          </li>
        ))}
      </ul>
      <section aria-labelledby="your-stars" className="flex flex-col gap-4">
        <h2 id="your-stars" className="text-3xl">
          {achievementCaptions.heading}
        </h2>
        {earned.size === 0 && <p className="text-ink-soft">{achievementCaptions.empty}</p>}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map(({ id, title, how, href }) => {
            const has = earned.has(id);
            return (
              <li
                key={id}
                data-achievement={id}
                data-earned={has}
                className="flex items-start gap-3 rounded-card border border-hairline bg-card p-4"
              >
                <AchievementMark earned={has} className="mt-0.5 size-6 shrink-0" />
                <div className="flex flex-col gap-1">
                  <Link href={href} prefetch={false} className={LINK}>
                    {(has ? achievementCaptions.has : achievementCaptions.locked)(title)}
                  </Link>
                  <p className="text-sm text-ink-soft">{how}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-labelledby="idea-cards" className="flex flex-col gap-4">
        <h2 id="idea-cards" className="text-3xl">
          {glossaryCaptions.heading}
        </h2>
        <p className="max-w-prose text-ink-soft">{glossaryCaptions.headingNote}</p>
        {worlds.map(({ world, title }) => (
          <div key={world} className="flex flex-col gap-2">
            <h3 className="text-xl">{title}</h3>
            <ul className="flex flex-wrap gap-2">
              {lessons
                .filter((lesson) => lesson.world === world)
                .map((lesson) => (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      data-idea-card={lesson.id}
                      aria-label={words.openCard(lesson.title)}
                      className={BUTTON}
                      onClick={() => openCard?.(lesson.id)}
                    >
                      {lesson.title}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
