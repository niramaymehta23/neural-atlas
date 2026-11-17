"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { Color, Group } from "three";
import { constellationCaptions as captions } from "./captions";
import type { Star } from "./layout";

type StarMarkProps = {
  star: Star;
  colour: Color;
  ringColour: Color;
  learned: boolean;
  suggested: boolean;
  /** Another group is picked in the filter: the star fades back and cannot be chosen. */
  dimmed: boolean;
  /** Its paper label is open (pointer over it or keyboard focus on it). */
  shown: boolean;
  still: boolean;
  /** Where the star links live, laid over the canvas. */
  overlay: RefObject<HTMLElement>;
  onShow: (id: string | null) => void;
  onChoose: (id: string) => void;
};

const RADIUS = 0.07;
const DIMMED = 0.2;
const PULSE = { size: 0.18, seconds: 2.4 };

/**
 * One idea: a matte bead casting a soft shadow, with a real link laid over it so pointer and
 * keyboard reach it alike. The suggested idea wears a clay ring that breathes slowly.
 */
export function StarMark({
  star: { lesson, position },
  colour,
  ringColour,
  learned,
  suggested,
  dimmed,
  shown,
  still,
  overlay,
  onShow,
  onChoose,
}: StarMarkProps) {
  const ring = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!ring.current || still) return;
    const phase = (clock.elapsedTime / PULSE.seconds) * Math.PI * 2;
    ring.current.scale.setScalar(1 + PULSE.size * (0.5 + 0.5 * Math.sin(phase)));
  });

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[learned ? RADIUS * 1.15 : RADIUS, 24, 16]} />
        <meshStandardMaterial
          color={colour}
          roughness={0.9}
          metalness={0}
          transparent={dimmed}
          opacity={dimmed ? DIMMED : 1}
        />
      </mesh>
      {suggested && !dimmed && (
        <group ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <torusGeometry args={[RADIUS * 1.9, 0.01, 8, 48]} />
            <meshStandardMaterial color={ringColour} roughness={0.9} metalness={0} />
          </mesh>
        </group>
      )}
      {!dimmed && (
        <Html portal={overlay} center zIndexRange={[10, 0]}>
          <a
            href={`/learn/${lesson.id}`}
            aria-label={lesson.title}
            data-star={lesson.id}
            className="pointer-events-auto block size-7 rounded-pill"
            onMouseEnter={() => onShow(lesson.id)}
            onMouseLeave={() => onShow(null)}
            onFocus={() => onShow(lesson.id)}
            onBlur={() => onShow(null)}
            onClick={(event) => {
              event.preventDefault();
              onChoose(lesson.id);
            }}
          />
        </Html>
      )}
      {shown && !dimmed && (
        <Html portal={overlay} zIndexRange={[30, 20]} pointerEvents="none" position={[0, 0.1, 0]}>
          <div
            role="tooltip"
            className="w-60 -translate-x-1/2 -translate-y-full rounded-control border border-hairline bg-card px-3 py-2 text-ink shadow-lifted"
          >
            <p className="font-serif text-base">{lesson.title}</p>
            <p className="text-sm text-ink-soft">{lesson.idea}</p>
            {(learned || suggested) && (
              <p className="mt-1 text-xs text-accent-ink">
                {learned ? captions.learned : captions.next}
              </p>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
