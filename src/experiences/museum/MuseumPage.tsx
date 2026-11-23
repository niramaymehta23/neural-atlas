"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LessonErrorBoundary } from "@/platform/LessonErrorBoundary";
import { TermTag } from "@/ui/TermTag";
import { award } from "../achievements/achievements";
import { BUTTON, MAIN_BUTTON } from "../shell/buttons";
import { pages } from "../shell/captions";
import { PageFrame } from "../shell/ExperiencePage";
import { LessonStage } from "../shell/LessonStage";
import { museumCaptions as words } from "./captions";
import { PairExhibit } from "./PairExhibit";
import { roomFromHash, rooms, type Room, type RoomId } from "./rooms";

/** Rooms to try before the visit counts. */
export const ROOMS_FOR_STAR = 5;

type RoomViewProps = { room: Room; open: boolean; onOpen: (id: RoomId | null) => void };

function RoomView({ room, open, onOpen }: RoomViewProps) {
  const { id, year, title, story, today, term, exhibit } = room;
  const box = useRef<HTMLDivElement>(null);
  /** The exhibit's height while it was out, kept once it is put away so nothing jumps. */
  const [kept, setKept] = useState(0);

  // Measured while open, so whichever way it closes its space stays.
  useEffect(() => {
    const element = box.current;
    if (!open || !element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setKept(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  return (
    <li
      id={id}
      data-room={id}
      className="relative scroll-mt-20 border-l-2 border-hairline pb-14 pl-6 last:pb-0 md:pl-10"
    >
      <span
        aria-hidden
        className="absolute top-2 -left-[9px] size-4 rounded-pill border-2 border-ink bg-paper"
      />
      <article className="flex flex-col gap-4">
        <div className="flex max-w-prose flex-col gap-3">
          <p className="font-serif text-xl text-ink-soft">
            <time dateTime={`${year}`}>{year}</time>
          </p>
          <h2 tabIndex={-1} className="text-3xl leading-tight outline-none">
            {title}
          </h2>
          <p className="text-lg">{story}</p>
          <p className="text-ink-soft">{today}</p>
        </div>
        <div
          ref={box}
          className="flex flex-col gap-4"
          // Kept space is measured, so it cannot be a class.
          style={!open && kept > 0 ? { minHeight: kept } : undefined}
        >
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? words.awayNamed(title) : words.playNamed(title)}
              className={open ? BUTTON : MAIN_BUTTON}
              onClick={() => onOpen(open ? null : id)}
            >
              {open ? words.away : words.play}
            </button>
            <p className="text-sm text-ink-soft">{words.byHand}</p>
          </div>
          {open && (
            <LessonErrorBoundary className="min-h-72">
              {exhibit.kind === "lesson" ? (
                <LessonStage id={exhibit.lesson} />
              ) : (
                <PairExhibit garden={exhibit.garden} model={exhibit.model} />
              )}
            </LessonErrorBoundary>
          )}
        </div>
        <div className="min-h-9">
          {(open || kept > 0) && <TermTag lead={words.lead} term={term} />}
        </div>
      </article>
    </li>
  );
}

/**
 * The museum: rooms down a line of years. One room's exhibit is out at a time (a lesson's own
 * scene, or a learner in a garden), and only once it is asked for.
 */
export function MuseumPage() {
  const [open, setOpen] = useState<RoomId | null>(null);
  const tried = useRef(new Set<RoomId>());

  const show = useCallback((id: RoomId | null) => {
    setOpen(id);
    if (!id) return;
    tried.current.add(id);
    if (tried.current.size >= ROOMS_FOR_STAR) void award("museum");
  }, []);

  // An address with a room goes to that room (its exhibit waits to be asked for).
  useEffect(() => {
    const visit = () => {
      const room = roomFromHash(window.location.hash);
      const element = room && document.getElementById(room);
      if (!element) return;
      element.scrollIntoView({ block: "start" });
      element.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    };
    visit();
    window.addEventListener("hashchange", visit);
    return () => window.removeEventListener("hashchange", visit);
  }, []);

  return (
    <PageFrame title={pages.museum.title} opening={pages.museum.opening}>
      <nav
        aria-label={words.years}
        className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b border-hairline bg-paper px-4 py-2 md:mx-0 md:px-0"
      >
        <ul className="flex w-max gap-1">
          {rooms.map(({ id, year, title }) => (
            <li key={id}>
              <a
                href={`#room=${id}`}
                aria-label={`${year}: ${title}`}
                className="inline-flex min-h-11 items-center rounded-pill px-3 text-sm text-accent-ink underline-offset-4 hover:underline"
              >
                {year}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <ol aria-label={words.rooms} className="ml-2 flex flex-col">
        {rooms.map((room) => (
          <RoomView key={room.id} room={room} open={open === room.id} onOpen={show} />
        ))}
      </ol>
      <p className="max-w-prose text-lg text-ink-soft">{words.end}</p>
    </PageFrame>
  );
}
