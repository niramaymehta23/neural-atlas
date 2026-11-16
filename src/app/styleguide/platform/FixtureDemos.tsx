"use client";

import { valleyLesson } from "@/platform/fixture/fixture-module";
import { LessonView } from "@/platform/LessonView";
import { PuzzleView } from "@/platform/puzzle/PuzzleView";

const FIXTURE_LESSONS = [valleyLesson];

/** The fixture lesson in the real shell (it carries a loader, so it renders on the client). */
export function FixtureLesson() {
  return <LessonView lesson={valleyLesson} />;
}

export function FixturePuzzle() {
  return (
    <div className="w-full rounded-card border border-hairline" data-testid="fixture-puzzle">
      <PuzzleView lessons={FIXTURE_LESSONS} />
    </div>
  );
}
