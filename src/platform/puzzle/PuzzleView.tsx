"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MissionCard } from "@/ui/MissionCard";
import { platformCaptions } from "../captions";
import type { Lesson } from "../contract";
import { useProgress } from "../progress/progress";
import { SiteNav } from "../SiteNav";
import { dateKey, pickDaily, untilNextPuzzle } from "./puzzle";

type Puzzle =
  | { kind: "ready"; date: string; lesson: Lesson; mission: { id: string; goal: string } }
  | { kind: "none" | "failed" };

const words = platformCaptions.puzzle;
const NO_MISSIONS: readonly string[] = [];

/** The day's date, for people: "17 November 2026" in the learner's own language. */
const readableDate = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

async function pickPuzzle(lessons: readonly Lesson[], date: string): Promise<Puzzle> {
  const lesson = pickDaily(
    date,
    lessons.filter(({ load }) => load),
  );
  if (!lesson?.load) return { kind: "none" };
  const definition = await lesson.load();
  const mission = pickDaily(`${date}/${lesson.id}`, definition.missions);
  return mission ? { kind: "ready", date, lesson, mission } : { kind: "none" };
}

/** Today's date key, changing at UTC midnight and when the tab comes back after a while. */
function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const now = new Date();
      setToday(dateKey(now));
      clearTimeout(timer);
      timer = setTimeout(refresh, untilNextPuzzle(now) + 1000);
    };
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return today;
}

/** Today's break-it mission, picked from the built lessons by the UTC date. */
export function PuzzleView({ lessons }: { lessons: readonly Lesson[] }) {
  const today = useToday();
  const [attempt, setAttempt] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);

  useEffect(() => {
    if (!today) return;
    let current = true;
    pickPuzzle(lessons, today).then(
      (picked) => current && setPuzzle(picked),
      () => current && setPuzzle({ kind: "failed" }),
    );
    return () => {
      current = false;
    };
  }, [lessons, today, attempt]);

  const lessonId = puzzle?.kind === "ready" ? puzzle.lesson.id : "";
  const done = useProgress(({ lessons }) => lessons[lessonId]?.missions ?? NO_MISSIONS);
  const shown = puzzle?.kind === "ready" && puzzle.date === today ? puzzle : null;
  const solved = shown ? done.includes(shown.mission.id) : false;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-6">
      <SiteNav current="puzzle" />
      <div className="flex grow flex-col justify-center gap-6 pb-12">
        <h1 tabIndex={-1} className="text-4xl leading-tight outline-none">
          {words.title}
        </h1>
        <p className="text-ink-soft">{words.note}</p>
        {today && <p className="text-sm text-ink-soft">{words.date(readableDate(today))}</p>}
        <div role="status" className="flex flex-col gap-4">
          {!puzzle && <p className="text-ink-soft">{words.loading}</p>}
          {puzzle?.kind === "none" && <p>{words.empty}</p>}
          {puzzle?.kind === "failed" && (
            <div className="flex flex-col items-start gap-3">
              <p>{words.failed}</p>
              <button
                type="button"
                onClick={() => {
                  setPuzzle(null);
                  setAttempt((count) => count + 1);
                }}
                className="min-h-11 rounded-pill border border-hairline bg-card px-4 py-2 text-sm text-accent-ink"
              >
                {platformCaptions.problem.retry}
              </button>
            </div>
          )}
          {solved && <p data-solved>{words.solved}</p>}
        </div>
        {shown && (
          <div className="flex flex-col items-start gap-4" data-lesson={shown.lesson.id}>
            <p className="font-serif text-xl">{shown.lesson.title}</p>
            <MissionCard goal={shown.mission.goal} done={solved} />
            <Link
              href={`/learn/${shown.lesson.id}#mission=${shown.mission.id}`}
              className="inline-flex min-h-11 items-center rounded-pill bg-accent px-5 py-2 text-on-accent"
            >
              {words.go}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
