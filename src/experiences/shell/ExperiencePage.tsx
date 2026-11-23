"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Timeline } from "@/engine/timeline/timeline";
import { platformCaptions } from "@/platform/captions";
import type { ModuleState, TimelineFrame } from "@/platform/contract";
import { LessonErrorBoundary } from "@/platform/LessonErrorBoundary";
import type { ModuleStore } from "@/platform/module-store";
import { ShareControl } from "@/platform/ShareControl";
import { SiteNav } from "@/platform/SiteNav";
import { shellCaptions } from "./captions";
import { useExperience, type ExperienceSpec, type ExperienceView } from "./use-experience";

export type Announce = (message: string) => void;

type PageFrameProps = {
  title: string;
  opening: string;
  /** Under the opening: the share control, a way back. */
  header?: ReactNode;
  announcement?: string;
  children: ReactNode;
};

/** The frame of every experience: the way around, a title, an opening line, a status region. */
export function PageFrame({ title, opening, header, announcement, children }: PageFrameProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 [overflow-anchor:none] md:px-6">
      <SiteNav current="other" />
      <header className="flex flex-col gap-3">
        <h1 tabIndex={-1} className="text-4xl leading-tight outline-none md:text-5xl">
          {title}
        </h1>
        <p className="max-w-prose text-lg text-ink-soft">{opening}</p>
        {header}
      </header>
      <LessonErrorBoundary className="min-h-72">{children}</LessonErrorBoundary>
      <p role="status" data-announcer className="sr-only">
        {announcement}
      </p>
    </main>
  );
}

/** A status line that says a repeated message again, for screen readers. */
export function useAnnouncer(): { announcement: string; announce: Announce } {
  const [announcement, setAnnouncement] = useState("");
  const announce = useCallback(
    (message: string) => setAnnouncement((last) => (last === message ? `${message} ` : message)),
    [],
  );
  return { announcement, announce };
}

type ExperiencePageProps<S extends ModuleState> = {
  spec: ExperienceSpec<S>;
  title: string;
  opening: string;
  /** Extra controls beside "Copy a link". */
  tools?: (view: ExperienceView<S> & { announce: Announce }) => ReactNode;
  children: (view: ExperienceView<S> & { announce: Announce }) => ReactNode;
};

/**
 * An experience whose whole view fits in a link: it opens what the link says (or says why it
 * could not), offers a link to what is on screen, and keeps its space while it opens.
 */
export function ExperiencePage<S extends ModuleState>({
  spec,
  title,
  opening,
  tools,
  children,
}: ExperiencePageProps<S>) {
  const { ready, problem, theirs, state, update, store, edits, visit, startOwn } =
    useExperience(spec);
  const { announcement, announce } = useAnnouncer();
  // Links save the state alone: nothing here is recorded on a timeline.
  const [timeline] = useState(() => new Timeline<TimelineFrame>());
  return (
    <PageFrame
      title={title}
      opening={opening}
      announcement={announcement}
      header={
        <>
          <div className="min-h-6 text-sm text-ink-soft empty:hidden">
            {problem && (
              <p role="status" data-link-problem={problem}>
                {platformCaptions.link[problem]}
              </p>
            )}
            {theirs && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <p>{platformCaptions.link.theirs}</p>
                <button
                  type="button"
                  onClick={startOwn}
                  className="min-h-11 text-accent-ink underline-offset-4 hover:underline md:min-h-0"
                >
                  {platformCaptions.link.startOwn}
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <ShareControl
              key={edits}
              lessonId={spec.id}
              store={store as unknown as ModuleStore}
              timeline={timeline}
              announce={announce}
            />
            {ready && tools?.({ state, update, announce })}
          </div>
        </>
      }
    >
      {ready ? (
        <div key={visit} className="flex flex-col gap-6">
          {children({ state, update, announce })}
        </div>
      ) : (
        <p className="min-h-[60dvh] py-24 text-center text-ink-soft">{shellCaptions.loading}</p>
      )}
    </PageFrame>
  );
}
