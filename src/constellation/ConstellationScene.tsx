"use client";

import { ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Color, SRGBColorSpace, type Group } from "three";
import { learnedTone, linkTone, worldTone } from "@/design/encodings";
import { useReducedMotion } from "@/design/motion";
import { useResolvedColours } from "@/design/paint";
import type { WorldNumber } from "@/platform/contract";
import type { Vec3 } from "@/scene3d/CameraRig";
import { SoftStage } from "@/scene3d/SoftStage";
import { constellationCaptions as captions } from "./captions";
import { ExtraStars, type ExtraStar } from "./ExtraStars";
import { startFloating } from "./floating";
import {
  DIMMED,
  floatOffset,
  mapFraming,
  offset,
  partitionLinks,
  type Link,
  type Star,
} from "./layout";
import { Links } from "./Links";
import { StarMark } from "./StarMark";

type ConstellationSceneProps = {
  stars: readonly Star[];
  links: readonly Link[];
  learned: ReadonlySet<string>;
  /** Ideas whose lesson exists; the rest are still being drawn. */
  built: ReadonlySet<string>;
  suggested: string | null;
  /** The group picked in the filter, or null for all of them. */
  world: WorldNumber | null;
  /** The idea the camera is flying into. */
  flyingTo: string | null;
  /** The learner pointed at or focused an idea (a good moment to fetch its lesson). */
  onPoint: (id: string) => void;
  onChoose: (id: string) => void;
  /** Stars earned beyond the ideas, in the order they take their places. */
  extras?: readonly ExtraStar[];
  /** Shown instead of the map where 3D cannot run (no WebGL, or it failed). */
  fallback: ReactNode;
};

const WORLDS: readonly WorldNumber[] = [1, 2, 3, 4, 5, 6];
const CLOSE_UP: Vec3 = [0, 0.3, 0.75];

/** How far the map leans away from the pointer, for a touch of depth. */
const PARALLAX = 0.05;
/** Share of the remaining lean taken each frame. */
const LEAN_STEP = 0.1;
const INK = "var(--color-ink)";

/**
 * Keeps frames coming while the map floats (the stage only draws on demand), about 30 a second
 * and only while the learner is around. It stops once a flight starts: the camera glide draws
 * its own frames, and the lesson then loads on a quiet page.
 */
function KeepFloating() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => startFloating(invalidate), [invalidate]);
  return null;
}

/** Leans the whole map a little away from the pointer. Off under reduced motion. */
function Parallax({ still, children }: { still: boolean; children: ReactNode }) {
  const group = useRef<Group>(null);
  useFrame(({ pointer }) => {
    if (!group.current || still) return;
    const lean = group.current.position;
    lean.x += (-pointer.x * PARALLAX - lean.x) * LEAN_STEP;
    lean.y += (-pointer.y * PARALLAX - lean.y) * LEAN_STEP;
  });
  return <group ref={group}>{children}</group>;
}

/** One world's group, bobbing slowly as a whole. */
function Drift({
  world,
  still,
  children,
}: {
  world: WorldNumber;
  still: boolean;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current && !still) group.current.position.y = floatOffset(world, clock.elapsedTime);
  });
  return <group ref={group}>{children}</group>;
}

/** Where the camera sits: the whole map, one group, or right beside the chosen idea. */
function framing(
  stars: readonly Star[],
  world: WorldNumber | null,
  flyingTo: string | null,
  aspect: number,
) {
  const star = stars.find(({ lesson }) => lesson.id === flyingTo);
  if (star) return { position: offset(star.position, CLOSE_UP), target: star.position };
  return mapFraming(world, aspect);
}

/**
 * The home map in depth: six softly tinted groups of ideas floating over the paper, joined by
 * thin warm lines, casting soft shadows. Nothing needs rotating; the camera frames it.
 */
export function ConstellationScene({
  stars,
  links,
  learned,
  built,
  suggested,
  world,
  flyingTo,
  onPoint,
  onChoose,
  extras = [],
  fallback,
}: ConstellationSceneProps) {
  const still = useReducedMotion();
  // Star links render into the overlay once it exists (the canvas is role="img", so not in there).
  const [overlay, setOverlay] = useState<HTMLElement | null>(null);
  const portal = useMemo(() => overlay && { current: overlay }, [overlay]);
  // Measured before the stage mounts, so the first view is already framed (no glide on load).
  const [aspect, setAspect] = useState<number | null>(null);
  useEffect(() => {
    if (!overlay) return;
    const measure = ({ width, height }: { width: number; height: number }) =>
      setAspect(width / Math.max(1, height));
    measure(overlay.getBoundingClientRect());
    const observer = new ResizeObserver(([entry]) => entry && measure(entry.contentRect));
    observer.observe(overlay);
    return () => observer.disconnect();
  }, [overlay]);
  const [shown, setShown] = useState<string | null>(null);
  // Stable handlers, so pointing at one star re-renders that star and the last one, not all 74
  // (each re-render redraws an Html overlay, which is slow on a software-drawn map).
  const latest = useRef({ onPoint, onChoose });
  useLayoutEffect(() => {
    latest.current = { onPoint, onChoose };
  });
  const show = useCallback((id: string | null) => {
    setShown(id);
    if (id) latest.current.onPoint(id);
  }, []);
  const choose = useCallback((id: string) => latest.current.onChoose(id), []);
  const tones = useResolvedColours([INK, linkTone, learnedTone, ...WORLDS.map(worldTone)]);
  const [ink, link, clay, ...tints] = useMemo(
    () => tones.map(([r, g, b]) => new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)),
    [tones],
  );
  const lines = useMemo(() => partitionLinks(stars, links, world), [stars, links, world]);

  return (
    <div className="relative h-full w-full">
      {portal && aspect !== null && ink && link && clay && (
        <SoftStage
          label={captions.map}
          camera={framing(stars, world, flyingTo, aspect)}
          className="h-full w-full"
          fallback={fallback}
        >
          {!still && !flyingTo && <KeepFloating />}
          <Parallax still={still || flyingTo !== null}>
            {WORLDS.map((group) => (
              <Drift key={group} world={group} still={still}>
                {stars
                  .filter(({ lesson }) => lesson.world === group)
                  .map((star) => (
                    <StarMark
                      key={star.lesson.id}
                      star={star}
                      colour={learned.has(star.lesson.id) ? clay : (tints[group - 1] ?? link)}
                      ringColour={clay}
                      outlineColour={link}
                      learned={learned.has(star.lesson.id)}
                      suggested={star.lesson.id === suggested}
                      built={built.has(star.lesson.id)}
                      dimmed={world !== null && world !== group}
                      close={world === group || flyingTo === star.lesson.id}
                      shown={shown === star.lesson.id}
                      still={still}
                      overlay={portal}
                      onShow={show}
                      onChoose={choose}
                    />
                  ))}
              </Drift>
            ))}
            {world === null && !flyingTo && <ExtraStars extras={extras} overlay={portal} />}
            <Links stars={stars} links={lines.chosen} colour={link} opacity={0.85} still={still} />
            <Links stars={stars} links={lines.other} colour={link} opacity={DIMMED} still={still} />
          </Parallax>
          {/* Drawn once: the bob is too small to move a soft shadow, and redrawing it costs. */}
          <ContactShadows
            frames={1}
            color={ink}
            scale={[10, 8]}
            blur={2.4}
            far={1.2}
            opacity={0.32}
            resolution={512}
          />
        </SoftStage>
      )}
      <nav
        ref={setOverlay}
        aria-label={captions.ideas}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      />
    </div>
  );
}
