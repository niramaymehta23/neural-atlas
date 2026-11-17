"use client";

import { platformCaptions } from "@/platform/captions";
import { ProblemPage } from "@/platform/ProblemPage";

/** Any page that throws: a calm note, Try again, and the way back to the map. */
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  const { title, note } = platformCaptions.pageError;
  return <ProblemPage title={title} note={note} onRetry={retry} />;
}
