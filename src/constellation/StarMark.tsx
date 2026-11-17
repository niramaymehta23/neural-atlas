"use client";

import { Billboard, Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import { DoubleSide, type Color, type Group } from "three";
import { keepInside } from "./label-place";
import { DIMMED, type Star } from "./layout";
import { StarLabel } from "./StarLabel";
import { starName, starStatus } from "./status";

type StarMarkProps = {
  star: Star;
  colour: Color;
  ringColour: Color;
  /** The thin line an idea that is still being drawn is outlined in. */
  outlineColour: Color;
  learned: boolean;
  suggested: boolean;
  /** Its lesson exists; otherwise the star is a hollow outline. */
  built: boolean;
  /** Another group is picked in the filter: the star fades back and cannot be chosen. */
  dimmed: boolean;
  /** Its paper label is open (pointer over it, keyboard focus on it, or a first tap). */
  shown: boolean;
  still: boolean;
  /** Where the star links live, laid over the canvas. */
  overlay: RefObject<HTMLElement>;
  onShow: (id: string | null) => void;
  onChoose: (id: string) => void;
};

const RADIUS = 0.07;
const PULSE = { size: 0.18, seconds: 2.4 };
/** How much a bead swells while its label is open. */
export const BEAD_GROW = 1.3;
/** Share of the remaining way the bead's size moves each frame: a soft spring. */
const GROW_STEP = 0.2;

/** The size a bead heads for. */
export function beadScale(shown: boolean): number {
  return shown ? BEAD_GROW : 1;
}

/** A plain left click; anything else (new tab, new window, middle button) is the browser's. */
function plainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * One idea: a matte bead casting a soft shadow, with a real link laid over it so pointer and
 * keyboard reach it alike. The suggested idea wears a clay ring that breathes slowly; a learned
 * one carries a tick; one still being drawn is a hollow outline.
 */
export const StarMark = memo(function StarMark({
  star: { lesson, position },
  colour,
  ringColour,
  outlineColour,
  learned,
  suggested,
  built,
  dimmed,
  shown,
  still,
  overlay,
  onShow,
  onChoose,
}: StarMarkProps) {
  const invalidate = useThree((state) => state.invalidate);
  const ring = useRef<Group>(null);
  const bead = useRef<Group>(null);
  const labelOuter = useRef<HTMLDivElement>(null);
  const labelCard = useRef<HTMLDivElement>(null);
  // Fit the label inside the map the moment it mounts, not a frame later: it never flashes
  // half off screen, and on a slow (software-drawn) map it is in place as soon as it shows.
  const placeLabel = useCallback(
    (outer: HTMLDivElement | null) => {
      labelOuter.current = outer;
      if (outer && labelCard.current && overlay.current)
        keepInside(outer, labelCard.current, overlay.current.getBoundingClientRect());
    },
    [overlay],
  );
  // A finger cannot hover: the first tap opens the label, the second (or Open) steps inside.
  const pressed = useRef<{ touch: boolean; wasShown: boolean } | null>(null);
  const [tapped, setTapped] = useState(false);
  const status = starStatus({ learned, suggested, built });
  const open = shown && !dimmed;

  useEffect(() => invalidate(), [open, invalidate]);

  useFrame(({ clock }) => {
    if (ring.current && !still) {
      const phase = (clock.elapsedTime / PULSE.seconds) * Math.PI * 2;
      ring.current.scale.setScalar(1 + PULSE.size * (0.5 + 0.5 * Math.sin(phase)));
    }
    if (bead.current) {
      const goal = beadScale(open);
      const now = bead.current.scale.x;
      const next = still || Math.abs(goal - now) < 0.005 ? goal : now + (goal - now) * GROW_STEP;
      bead.current.scale.setScalar(next);
      if (next !== goal) invalidate();
    }
    if (open && labelOuter.current && labelCard.current && overlay.current) {
      keepInside(labelOuter.current, labelCard.current, overlay.current.getBoundingClientRect());
    }
  });

  return (
    <group position={position}>
      <group ref={bead}>
        {built ? (
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
        ) : (
          <Billboard>
            <mesh>
              <ringGeometry args={[RADIUS * 0.72, RADIUS, 32]} />
              <meshBasicMaterial
                color={outlineColour}
                side={DoubleSide}
                transparent
                opacity={dimmed ? DIMMED : 1}
              />
            </mesh>
          </Billboard>
        )}
      </group>
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
            aria-label={starName(lesson.title, status)}
            data-star={lesson.id}
            data-status={status ?? undefined}
            className="pointer-events-auto flex size-7 items-center justify-center rounded-pill"
            onPointerEnter={(event) => {
              if (event.pointerType === "touch") return;
              setTapped(false);
              onShow(lesson.id);
            }}
            onPointerLeave={(event) => event.pointerType !== "touch" && onShow(null)}
            onPointerDown={(event) => {
              pressed.current = { touch: event.pointerType === "touch", wasShown: shown };
            }}
            onFocus={() => onShow(lesson.id)}
            onBlur={() => {
              setTapped(false);
              onShow(null);
            }}
            onClick={(event) => {
              if (!plainClick(event)) return;
              event.preventDefault();
              const press = pressed.current;
              pressed.current = null;
              if (press?.touch && !press.wasShown) {
                setTapped(true);
                onShow(lesson.id);
                return;
              }
              onChoose(lesson.id);
            }}
          >
            {learned && (
              <svg aria-hidden viewBox="0 0 12 12" className="size-3 text-paper">
                <path
                  d="M2.5 6.5l2.3 2.3 4.7-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </a>
        </Html>
      )}
      {open && (
        <Html portal={overlay} zIndexRange={[30, 20]} pointerEvents="none" position={[0, 0.1, 0]}>
          <StarLabel
            lesson={lesson}
            status={status}
            touched={tapped}
            onOpen={() => onChoose(lesson.id)}
            outerRef={placeLabel}
            cardRef={labelCard}
          />
        </Html>
      )}
    </group>
  );
});
