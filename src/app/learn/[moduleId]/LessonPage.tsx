"use client";

import { lessonById, lessons } from "@/catalog";
import { LessonView } from "@/platform/LessonView";
import { nextSuggested, useProgress } from "@/platform/progress/progress";

/** Lessons carry their lazy loader, a function, so the client looks the lesson up itself. */
export function LessonPage({ id }: { id: string }) {
  const lesson = lessonById(id);
  const nextId = useProgress((progress) =>
    nextSuggested(
      lessons.filter((other) => other.id !== id),
      progress,
    ),
  );
  const next = nextId ? lessonById(nextId) : undefined;
  return lesson ? (
    <LessonView lesson={lesson} nextIdea={next?.load ? { id: next.id, title: next.title } : null} />
  ) : null;
}
