"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { lessons, worlds } from "@/catalog";
import { cameraGlide, springs, useReducedMotion } from "@/design/motion";
import type { WorldNumber } from "@/platform/contract";
import { isMastered, nextSuggested, useProgress } from "@/platform/progress/progress";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { constellationCaptions as captions } from "./captions";
import { layoutConstellation } from "./layout";

// The 3D map loads after the page has painted, so the words arrive first.
const ConstellationScene = dynamic(
  () => import("./ConstellationScene").then(({ ConstellationScene }) => ConstellationScene),
  { ssr: false },
);

const { stars, links } = layoutConstellation(lessons);
const ALL = "all";
const FILTERS = [
  { value: ALL, label: captions.all },
  ...worlds.map(({ world, title }) => ({ value: `${world}`, label: title })),
];

/**
 * The home page: the map of every idea. Choosing one flies the camera in and opens the lesson;
 * under reduced motion the page simply fades across instead.
 */
export function HomeMap() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const progress = useProgress((saved) => saved);
  const [world, setWorld] = useState<WorldNumber | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const learned = useMemo(
    () => new Set(lessons.filter(({ id }) => isMastered(progress.lessons[id])).map(({ id }) => id)),
    [progress],
  );
  const suggested = useMemo(() => nextSuggested(lessons, progress), [progress]);
  const fading = leaving !== null && reduced;

  // After the flight lands, step inside. (The fade path steps inside when the fade ends.)
  useEffect(() => {
    if (!leaving || reduced) return;
    const land = setTimeout(() => router.push(`/learn/${leaving}`), cameraGlide.duration * 1000);
    return () => clearTimeout(land);
  }, [leaving, reduced, router]);

  return (
    <motion.main
      data-leaving={leaving ? (reduced ? "fade" : "fly") : undefined}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={springs.fade}
      onAnimationComplete={() => {
        if (fading) router.push(`/learn/${leaving}`);
      }}
      className="relative h-dvh overflow-hidden"
    >
      <div className="absolute inset-0">
        <ConstellationScene
          stars={stars}
          links={links}
          learned={learned}
          suggested={suggested}
          world={world}
          flyingTo={leaving && !reduced ? leaving : null}
          onPoint={(id) => router.prefetch(`/learn/${id}`)}
          onChoose={(id) => {
            if (leaving) return;
            router.prefetch(`/learn/${id}`);
            setLeaving(id);
          }}
        />
      </div>
      <header className="pointer-events-none relative flex flex-col gap-3 p-6 sm:p-10">
        <h1 className="text-4xl sm:text-5xl">{captions.heading}</h1>
        <p className="max-w-md text-ink-soft">{captions.welcome}</p>
        <div className="pointer-events-auto max-w-full self-start overflow-x-auto">
          <SegmentedControl
            label={captions.filter}
            options={FILTERS}
            value={world === null ? ALL : `${world}`}
            onChange={(value) =>
              setWorld(worlds.find((entry) => `${entry.world}` === value)?.world ?? null)
            }
          />
        </div>
      </header>
    </motion.main>
  );
}
