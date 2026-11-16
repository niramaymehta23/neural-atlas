"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MissionCard } from "@/ui/MissionCard";
import { platformCaptions } from "../captions";
import type { Lesson } from "../contract";
import { dateKey, pickDaily } from "./puzzle";

type Puzzle = { lesson: Lesson; mission: { id: string; goal: string } } | "none";
const words = platformCaptions.puzzle;

/** Today's break-it mission, picked from the built lessons by the learner's date. */
export function PuzzleView({ lessons }: { lessons: readonly Lesson[] }) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);

  useEffect(() => {
    let current = true;
    const date = dateKey(new Date());
    const lesson = pickDaily(
      date,
      lessons.filter(({ load }) => load),
    );
    void (lesson?.load?.() ?? Promise.resolve(null)).then((module) => {
      const mission = lesson && pickDaily(`${date}/${lesson.id}`, module?.missions ?? []);
      if (current) setPuzzle(lesson && mission ? { lesson, mission } : "none");
    });
    return () => {
      current = false;
    };
  }, [lessons]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <h1 className="text-4xl leading-tight">{words.title}</h1>
      <p className="text-ink-soft">{words.note}</p>
      {puzzle === "none" && <p role="status">{words.empty}</p>}
      {puzzle && puzzle !== "none" && (
        <div className="flex flex-col items-start gap-4" data-lesson={puzzle.lesson.id}>
          <p className="font-serif text-xl">{puzzle.lesson.title}</p>
          <MissionCard goal={puzzle.mission.goal} done={false} />
          <Link
            href={`/learn/${puzzle.lesson.id}#mission=${puzzle.mission.id}`}
            className="rounded-pill bg-accent px-5 py-2 text-paper"
          >
            {words.go}
          </Link>
        </div>
      )}
    </main>
  );
}
