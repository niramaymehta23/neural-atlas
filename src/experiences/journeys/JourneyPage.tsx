"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { lessonById } from "@/catalog";
import { count, sentenceStart } from "@/design/copy";
import { Toggle } from "@/ui/Toggle";
import { award } from "../achievements/achievements";
import { BUTTON, LINK, MAIN_BUTTON } from "../shell/buttons";
import { PageFrame, useAnnouncer } from "../shell/ExperiencePage";
import { LessonStage, preloadLesson } from "../shell/LessonStage";
import { journeyCaptions as words } from "./captions";
import { hashForStop, stopFromHash, type Journey } from "./journeys";

/** How long a stop stays before moving on by itself: long enough to read and look around. */
export const AUTO_MS = 45_000;

/**
 * A guided walk through lessons: what each stop has to say, above the lesson's own scene and
 * dials. The stop is in the address, so a link or the back button lands on it.
 */
export function JourneyPage({ journey }: { journey: Journey }) {
  const { stops, title, line, end } = journey;
  const [stop, setStop] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const { announcement, announce } = useAnnouncer();

  useEffect(() => {
    const read = () => setStop(stopFromHash(window.location.hash, stops.length));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [stops]);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= stops.length) return;
      moved.current = true;
      // A step of its own in the history, so Back goes back a stop.
      window.history.pushState(null, "", hashForStop(next));
      setStop(next);
      // Walking to the end earns the star; opening a link there does not.
      if (next === stops.length - 1) void award("journey");
    },
    [stops],
  );

  useEffect(() => {
    if (stop === null) return;
    preloadLesson(lessonById(stops[stop + 1]?.lesson ?? ""));
    if (!moved.current) return;
    moved.current = false;
    // The new stop's heading takes the focus (and the screen), wherever the last one was left.
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start" });
    announce(words.stop(count(stop + 1), count(stops.length)));
  }, [stop, stops, announce]);

  useEffect(() => {
    if (!auto || stop === null || stop >= stops.length - 1) return;
    const timer = setTimeout(() => go(stop + 1), AUTO_MS);
    return () => clearTimeout(timer);
  }, [auto, stop, stops, go]);

  const pauseAuto = useCallback(() => setAuto(false), []);
  // Back and Forward arrive as hash changes only for links; pushed states need this one.
  useEffect(() => {
    const onPop = () => {
      moved.current = true;
      setStop(stopFromHash(window.location.hash, stops.length));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [stops]);

  const here = stop === null ? undefined : stops[stop];
  const last = stop === stops.length - 1;
  return (
    <PageFrame
      title={title}
      opening={line}
      announcement={announcement}
      header={
        <p className="text-sm">
          <Link href="/journeys" className={`inline-flex min-h-11 items-center ${LINK}`}>
            {words.others}
          </Link>
        </p>
      }
    >
      <nav aria-label={words.map}>
        <ol className="flex flex-wrap gap-2">
          {stops.map(({ lesson }, at) => (
            <li key={lesson}>
              <button
                type="button"
                aria-current={at === stop ? "step" : undefined}
                aria-label={`${words.stop(count(at + 1), count(stops.length))}: ${lessonById(lesson)?.title ?? ""}`}
                onClick={() => go(at)}
                className="grid size-11 place-items-center rounded-pill border border-hairline bg-card text-sm text-ink-soft aria-[current=step]:border-2 aria-[current=step]:border-ink aria-[current=step]:text-ink"
              >
                {at + 1}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <section
        data-stop={stop === null ? undefined : stop + 1}
        className="flex min-h-[70dvh] flex-col gap-5"
      >
        {here && stop !== null && (
          <>
            <div className="flex max-w-prose flex-col gap-2">
              <p className="text-sm text-ink-soft">
                {words.stop(count(stop + 1), count(stops.length))}
              </p>
              <h2
                ref={heading}
                tabIndex={-1}
                className="scroll-mt-4 text-3xl leading-tight outline-none"
              >
                {lessonById(here.lesson)?.title}
              </h2>
              <p className="text-lg text-ink">{here.words}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={BUTTON}
                disabled={stop === 0}
                onClick={() => go(stop - 1)}
              >
                {words.back}
              </button>
              {!last && (
                <button type="button" className={MAIN_BUTTON} onClick={() => go(stop + 1)}>
                  {words.next}
                </button>
              )}
              {!last && <Toggle label={words.auto} checked={auto} onChange={setAuto} />}
            </div>
            {auto && <p className="text-sm text-ink-soft">{words.autoNote}</p>}
            {last && (
              <div className="flex max-w-prose flex-col items-start gap-3 rounded-card border border-hairline bg-card p-6">
                <h3 className="text-2xl">{words.arrived}</h3>
                <p>{end}</p>
                <button type="button" className={BUTTON} onClick={() => go(0)}>
                  {words.again}
                </button>
              </div>
            )}
            <LessonStage key={here.lesson} id={here.lesson} onTouch={pauseAuto} />
          </>
        )}
      </section>
    </PageFrame>
  );
}

/** Every journey, to choose from. */
export function JourneyCards({ list }: { list: readonly Journey[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {list.map(({ id, title, line, stops }) => (
        <li
          key={id}
          className="flex flex-col items-start gap-3 rounded-card border border-hairline bg-card p-6"
        >
          <h2 className="text-2xl">{title}</h2>
          <p className="text-ink-soft">{line}</p>
          <p className="text-sm text-ink-soft">{words.stops(sentenceStart(count(stops.length)))}</p>
          <Link
            href={`/journeys/${id}`}
            aria-label={`${words.begin}: ${title}`}
            className={`inline-flex items-center ${MAIN_BUTTON}`}
          >
            {words.begin}
          </Link>
        </li>
      ))}
    </ul>
  );
}
