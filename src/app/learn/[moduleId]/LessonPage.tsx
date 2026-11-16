"use client";

import { lessonById } from "@/catalog";
import { LessonView } from "@/platform/LessonView";

/** Lessons carry their lazy loader, a function, so the client looks the lesson up itself. */
export function LessonPage({ id }: { id: string }) {
  const lesson = lessonById(id);
  return lesson ? <LessonView lesson={lesson} /> : null;
}
