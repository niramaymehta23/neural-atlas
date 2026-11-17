"use client";

import { platformCaptions } from "@/platform/captions";
import { ProblemPage } from "@/platform/ProblemPage";

/** A lesson that throws outside its own boundaries (its loader, its shell). */
export default function LessonError({ retry }: { error: unknown; retry: () => void }) {
  const { title, note } = platformCaptions.lessonError;
  return <ProblemPage title={title} note={note} onRetry={retry} />;
}
