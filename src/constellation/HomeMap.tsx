"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { lessonById, lessons, worlds } from "@/catalog";
import { cameraGlide, springs, useReducedMotion } from "@/design/motion";
import type { WorldNumber } from "@/platform/contract";
import {
  isMastered,
  nextSuggested,
  progressStore,
  useProgress,
} from "@/platform/progress/progress";
import { SiteNav } from "@/platform/SiteNav";
import { storageHealth } from "@/platform/storage";
import { paletteStore } from "@/ui/palette-store";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { constellationCaptions as captions } from "./captions";
import { layoutConstellation } from "./layout";
import { LessonList } from "./LessonList";

// The 3D map loads after the page has painted, so the words (and the plain list) arrive first.
const ConstellationScene = dynamic(
  () => import("./ConstellationScene").then(({ ConstellationScene }) => ConstellationScene),
  { ssr: false },
);

const { stars, links } = layoutConstellation(lessons);
const built: ReadonlySet<string> = new Set(lessons.filter(({ load }) => load).map(({ id }) => id));
const ALL = "all";
const FILTERS = [
  { value: ALL, label: captions.all },
  ...worlds.map(({ world, title }) => ({ value: `${world}`, label: title })),
];
/** The map waits this long at most for saved progress, so a returning learner's stars are right. */
const HOLD_MS = 300;

/** The group in the address (`/?world=3`), so it survives a trip into a lesson and back. */
function worldFromAddress(): WorldNumber | null {
  const asked = new URLSearchParams(window.location.search).get("world");
  return worlds.find(({ world }) => `${world}` === asked)?.world ?? null;
}

/** Start fetching a lesson's code, so it is ready when the flight lands. */
function preload(id: string) {
  // A failed fetch here is retried, and reported, by the lesson page itself.
  void lessonById(id)
    ?.load?.()
    .catch(() => undefined);
}

type Leaving = { id: string; fade: boolean };

/**
 * The home page: the map of every idea. Choosing a built idea flies the camera in and opens
 * the lesson; one still being drawn, or any under reduced motion, simply fades across instead.
 */
export function HomeMap() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const progress = useProgress((saved) => saved);
  const persistent = useStore(storageHealth, ({ persistent }) => persistent);
  const [world, setWorld] = useState<WorldNumber | null>(null);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [settled, setSettled] = useState(false);
  const filterBox = useRef<HTMLDivElement>(null);
  const refocusFilter = useRef(false);
  const learned = useMemo(
    () => new Set(lessons.filter(({ id }) => isMastered(progress.lessons[id])).map(({ id }) => id)),
    [progress],
  );
  const suggested = useMemo(() => nextSuggested(lessons, progress), [progress]);
  const fading = leaving?.fade === true;

  // Hold the map for saved progress (briefly), and pick up the group from the address.
  useEffect(() => {
    let current = true;
    const hold = new Promise((resolve) => setTimeout(resolve, HOLD_MS));
    void Promise.race([progressStore.ready, hold]).then(() => {
      if (!current) return;
      setWorld(worldFromAddress());
      setSettled(true);
    });
    return () => {
      current = false;
    };
  }, []);

  // Opening the palette mid-flight hands the trip over to the palette.
  useEffect(() => paletteStore.subscribe(({ open }) => open && setLeaving(null)), []);

  // After the flight lands, step inside. (The fade path steps inside when the fade ends.)
  useEffect(() => {
    if (!leaving || leaving.fade) return;
    const land = setTimeout(() => router.push(`/learn/${leaving.id}`), cameraGlide.duration * 1000);
    return () => clearTimeout(land);
  }, [leaving, router]);

  // A focused star that the filter just hid hands focus to the filter, not to the page.
  useEffect(() => {
    if (!refocusFilter.current) return;
    refocusFilter.current = false;
    filterBox.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')?.focus();
  }, [world]);

  const changeWorld = (next: WorldNumber | null) => {
    const active = document.activeElement;
    const focused = active instanceof HTMLElement ? active.dataset.star : undefined;
    const hidden = focused && next !== null && lessonById(focused)?.world !== next;
    refocusFilter.current = Boolean(hidden);
    window.history.replaceState(null, "", next === null ? "/" : `/?world=${next}`);
    setWorld(next);
  };

  return (
    <motion.main
      data-leaving={leaving ? (leaving.fade ? "fade" : "fly") : undefined}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={springs.fade}
      onAnimationComplete={() => {
        if (fading) router.push(`/learn/${leaving.id}`);
      }}
      // Tall views fit the map to the screen; short ones (landscape phones, big zoom) scroll.
      className={`flex min-h-dvh flex-col ${settled ? "[@media(min-height:30rem)]:h-dvh [@media(min-height:30rem)]:overflow-hidden" : ""}`}
    >
      <header inert={leaving !== null} className="relative z-10 flex flex-col gap-3 p-6 sm:px-10">
        <a
          href="#map"
          className="sr-only self-start rounded-control bg-card px-3 py-2 text-sm text-accent-ink focus:not-sr-only"
        >
          {captions.skip}
        </a>
        <SiteNav current="home" />
        <h1 className="text-4xl sm:text-5xl">{captions.heading}</h1>
        <p className="max-w-md text-ink-soft">{captions.welcome}</p>
        {!persistent && <p className="text-sm text-ink-soft">{captions.forgetful}</p>}
        {suggested === null && <p className="text-sm text-ink-soft">{captions.allDone}</p>}
        <div ref={filterBox} className="max-w-full self-start">
          <SegmentedControl
            label={captions.filter}
            options={FILTERS}
            vertical={false}
            value={world === null ? ALL : `${world}`}
            onChange={(value) =>
              changeWorld(worlds.find((entry) => `${entry.world}` === value)?.world ?? null)
            }
          />
        </div>
      </header>
      <div
        id="map"
        tabIndex={-1}
        className="relative min-h-80 flex-1 outline-none [@media(max-height:30rem)]:h-dvh [@media(max-height:30rem)]:flex-none"
      >
        {settled ? (
          <ConstellationScene
            stars={stars}
            links={links}
            learned={learned}
            built={built}
            suggested={suggested}
            world={world}
            flyingTo={leaving && !leaving.fade ? leaving.id : null}
            onPoint={(id) => {
              router.prefetch(`/learn/${id}`);
              preload(id);
            }}
            onChoose={(id) => {
              if (leaving) return;
              router.prefetch(`/learn/${id}`);
              preload(id);
              setLeaving({ id, fade: reduced || !built.has(id) });
            }}
            fallback={
              <LessonList
                learned={learned}
                suggested={suggested}
                className="h-full overflow-y-auto px-6 pb-10 sm:px-10"
              />
            }
          />
        ) : (
          <LessonList learned={learned} suggested={suggested} className="px-6 pb-10 sm:px-10" />
        )}
      </div>
    </motion.main>
  );
}
