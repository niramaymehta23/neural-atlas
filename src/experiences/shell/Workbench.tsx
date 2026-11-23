"use client";

import type { ReactNode } from "react";
import { platformCaptions } from "@/platform/captions";
import { LessonErrorBoundary } from "@/platform/LessonErrorBoundary";
import { useStageHeight } from "@/platform/use-stage-height";

type WorkbenchProps = {
  /** What is watched: on a phone it stays in view while the dials scroll beneath. */
  stage: ReactNode;
  dock: ReactNode;
};

/** A stage with its dials beside it (under it on a phone), each in its own error boundary. */
export function Workbench({ stage, dock }: WorkbenchProps) {
  const box = useStageHeight<HTMLDivElement>();
  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_20rem]">
      <div
        ref={box}
        data-region="stage"
        className="flex min-w-0 flex-col gap-3 max-md:min-h-(--stage-min) max-md:sticky max-md:top-[min(0px,calc(60dvh_-_var(--stage-h,0px)))] max-md:z-10 max-md:bg-paper max-md:pb-2"
      >
        <section
          aria-label={platformCaptions.scene}
          className="flex flex-col gap-4 rounded-card border border-hairline bg-card p-4"
        >
          <LessonErrorBoundary className="min-h-72">{stage}</LessonErrorBoundary>
        </section>
      </div>
      <aside
        aria-label={platformCaptions.dials}
        data-region="dock"
        className="flex min-w-0 flex-col gap-4"
      >
        <LessonErrorBoundary>{dock}</LessonErrorBoundary>
      </aside>
    </div>
  );
}
