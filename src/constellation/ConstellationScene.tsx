"use client";

import { ContactShadows } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Color, SRGBColorSpace, type Group } from "three";
import { learnedTone, linkTone, worldTone } from "@/design/encodings";
import { useReducedMotion } from "@/design/motion";
import { useResolvedColours } from "@/design/paint";
import type { WorldNumber } from "@/platform/contract";
import type { Vec3 } from "@/scene3d/CameraRig";
import { SoftStage } from "@/scene3d/SoftStage";
import { constellationCaptions as captions } from "./captions";
import { floatOffset, worldCentre, type Link, type Star } from "./layout";
import { Links } from "./Links";
import { StarMark } from "./StarMark";

type ConstellationSceneProps = {
  stars: readonly Star[];
  links: readonly Link[];
  learned: ReadonlySet<string>;
  suggested: string | null;
  /** The group picked in the filter, or null for all of them. */
  world: WorldNumber | null;
  /** The idea the camera is flying into. */
  flyingTo: string | null;
  /** The learner pointed at or focused an idea (a good moment to fetch its lesson). */
  onPoint: (id: string) => void;
  onChoose: (id: string) => void;
};

const WORLDS: readonly WorldNumber[] = [1, 2, 3, 4, 5, 6];
const OVERVIEW = { target: [0, 0.3, -0.5] as Vec3, from: [0, 4.4, 5.6] as Vec3 };
const GROUP_VIEW: Vec3 = [0, 2.1, 2.7];
const CLOSE_UP: Vec3 = [0, 0.3, 0.75];
/** The widest view shape the framings fit without stepping back; narrower views step back. */
const FITS_ASPECT = 1.7;
const offset = ([x, y, z]: Vec3, [dx, dy, dz]: Vec3, scale = 1): Vec3 => [
  x + dx * scale,
  y + dy * scale,
  z + dz * scale,
];

/**
 * Keeps frames coming while the map floats (the stage only draws on demand). It stops once a
 * flight starts: the camera glide draws its own frames, and the lesson then loads on a quiet page.
 */
function KeepFloating() {
  useFrame((state) => state.invalidate());
  return null;
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

/**
 * Where the camera sits: the whole map, one group, or right beside the chosen idea. In a
 * narrow view (a phone held upright) it steps back so the sides still fit.
 */
function framing(
  stars: readonly Star[],
  world: WorldNumber | null,
  flyingTo: string | null,
  aspect: number,
) {
  const star = stars.find(({ lesson }) => lesson.id === flyingTo);
  if (star) return { position: offset(star.position, CLOSE_UP), target: star.position };
  const back = Math.max(1, FITS_ASPECT / aspect);
  const { target, from } =
    world === null ? OVERVIEW : { target: worldCentre(world), from: GROUP_VIEW };
  return { position: offset(target, from, back), target };
}

/**
 * The home map in depth: six softly tinted groups of ideas floating over the paper, joined by
 * thin warm lines, casting soft shadows. Nothing needs rotating; the camera frames it.
 */
export function ConstellationScene({
  stars,
  links,
  learned,
  suggested,
  world,
  flyingTo,
  onPoint,
  onChoose,
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
  const show = (id: string | null) => {
    setShown(id);
    if (id) onPoint(id);
  };
  const tones = useResolvedColours([linkTone, learnedTone, ...WORLDS.map(worldTone)]);
  const [link, clay, ...tints] = useMemo(
    () => tones.map(([r, g, b]) => new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)),
    [tones],
  );

  return (
    <div className="relative h-full w-full">
      {portal && aspect !== null && link && clay && (
        <SoftStage
          label={captions.map}
          camera={framing(stars, world, flyingTo, aspect)}
          className="h-full w-full"
        >
          {!still && !flyingTo && <KeepFloating />}
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
                    learned={learned.has(star.lesson.id)}
                    suggested={star.lesson.id === suggested}
                    dimmed={world !== null && world !== group}
                    shown={shown === star.lesson.id}
                    still={still}
                    overlay={portal}
                    onShow={show}
                    onChoose={onChoose}
                  />
                ))}
            </Drift>
          ))}
          <Links stars={stars} links={links} colour={link} still={still} />
          <ContactShadows scale={[10, 8]} blur={2.4} far={1.2} opacity={0.32} resolution={512} />
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
