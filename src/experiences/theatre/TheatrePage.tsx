"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { platformCaptions } from "@/platform/captions";
import { IdeaCardButton } from "@/ui/glossary/idea-cards";
import { award } from "../achievements/achievements";
import { BUTTON, LINK } from "../shell/buttons";
import { pages } from "../shell/captions";
import { theatreCaptions as words } from "./captions";
import {
  buildShow,
  hashForProgramme,
  PROGRAMMES,
  programmeFromHash,
  showAt,
  TURN_SECONDS,
  type Programme,
  type ShowId,
} from "./programme";
import { useAwake, useFullScreen, useIdle } from "./use-screen";
import { useTeller } from "./use-teller";
import { useTheatre } from "./use-theatre";

/** A minute of watching earns the star. */
const STAR_SECONDS = 60;
/** The lesson each show comes from, for its idea card. */
const IDEA: Record<ShowId, string> = {
  words: "guess-the-next-word",
  shapes: "stacking-cells",
  explorer: "scoring-every-move",
};

/**
 * A whole screen of a small model thinking. The controls sit on their own strips, so nothing is
 * ever drawn under them, and fade when nobody is touching anything.
 */
export function TheatrePage() {
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [turn, setTurn] = useState(0);
  const [paused, setPaused] = useState(false);
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [label, setLabel] = useState("");
  const watched = useRef({ turn: 0, all: 0 });
  const { fetched, retry } = useTeller();
  const { able, full, refused, toggle } = useFullScreen();

  useEffect(() => {
    const read = () => setProgramme(programmeFromHash(window.location.hash));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const teller = fetched.status === "ready" ? fetched.teller : null;
  const on = programme && showAt(programme, turn, fetched.status !== "failed");
  // A show that broke is built afresh with another seed, since the same one would break again.
  const cast = on === "words" ? teller : null;
  const show = useMemo(
    () => (on ? buildShow(on, cast, 1 + turn + attempt) : null),
    [on, cast, turn, attempt],
  );
  const playing = !paused && !broken && show !== null;
  const idle = useIdle(paused || broken || show === null);
  useAwake(playing);

  const onWatched = useCallback(
    (seconds: number) => {
      watched.current.all += seconds;
      watched.current.turn += seconds;
      if (watched.current.all >= STAR_SECONDS) void award("theatre");
      if (programme === "turns" && watched.current.turn >= TURN_SECONDS) {
        watched.current.turn = 0;
        setTurn((count) => count + 1);
      }
      if (show) setLabel(show.describe());
    },
    [programme, show],
  );
  const onBroken = useCallback(() => setBroken(true), []);
  const canvas = useTheatre({ show, playing, onWatched, onBroken });

  const choose = (next: Programme) => {
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}${hashForProgramme(next)}`);
    watched.current.turn = 0;
    setTurn(0);
    setBroken(false);
    setProgramme(next);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      // Space on a button or link is that button's own.
      if (event.key !== " " || target?.closest("button, a, input, [role=dialog]")) return;
      event.preventDefault();
      setPaused((now) => !now);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const strip = `flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 transition-opacity has-[a:focus-visible,button:focus-visible]:opacity-100 motion-reduce:transition-none ${idle ? "opacity-0" : ""}`;
  return (
    <main
      data-theatre={on ?? undefined}
      data-playing={playing}
      data-idle={idle}
      className={`flex h-dvh min-h-96 flex-col bg-paper ${idle ? "cursor-none" : ""}`}
    >
      <header data-fades className={`${strip} justify-between`}>
        <h1 tabIndex={-1} className="text-2xl outline-none">
          {pages.theatre.title}
        </h1>
        <Link
          href={pages.explore.path}
          className={`inline-flex min-h-11 items-center text-sm ${LINK}`}
        >
          {words.back}
        </Link>
      </header>
      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvas}
          role="img"
          aria-label={label || (on ? words.under[on] : words.loading)}
          className="absolute inset-0 size-full font-sans"
        />
        {show === null && fetched.status !== "failed" && (
          <p className="absolute inset-0 grid place-items-center text-ink-soft">{words.loading}</p>
        )}
        {(broken || (show === null && fetched.status === "failed")) && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper p-6 text-center"
          >
            <p>{broken ? platformCaptions.problem.title : words.failed}</p>
            <button
              type="button"
              className={BUTTON}
              onClick={() => {
                if (!broken) return retry();
                setBroken(false);
                setAttempt((count) => count + 1);
              }}
            >
              {platformCaptions.problem.retry}
            </button>
          </div>
        )}
      </div>
      <p className="px-4 text-center text-sm text-ink-soft">{on && words.under[on]}</p>
      <div data-controls data-fades className={strip}>
        <div role="group" aria-label={words.programme.label} className="flex flex-wrap gap-2">
          {PROGRAMMES.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={programme === id}
              onClick={() => choose(id)}
              className={`${BUTTON} aria-pressed:border-2 aria-pressed:border-ink`}
            >
              {words.programme[id]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${BUTTON} min-w-28`}
            onClick={() => setPaused((now) => !now)}
          >
            {paused ? words.play : words.pause}
          </button>
          {on && <IdeaCardButton about={IDEA[on]} />}
          {able && (
            <button type="button" className={`${BUTTON} min-w-44`} onClick={() => void toggle()}>
              {full ? words.shrink : words.full}
            </button>
          )}
        </div>
        <p className="text-sm text-ink-soft">
          {refused
            ? words.noFull
            : programme === "turns" && fetched.status === "failed"
              ? words.failed
              : words.keys}
        </p>
      </div>
    </main>
  );
}
