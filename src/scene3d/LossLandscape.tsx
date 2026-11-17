"use client";

import { Line, OrbitControls } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { BackSide, Color, PlaneGeometry, SRGBColorSpace } from "three";
import { warmth, type ClassShape } from "@/design/encodings";
import { useColourTable, useResolvedColours, type Rgb } from "@/design/paint";
import type { Vec3 } from "./CameraRig";
import { SoftStage } from "./SoftStage";
import { ValleyMap } from "./ValleyMap";

type Spot = { x: number; z: number };

type LossLandscapeProps = {
  /** Mistake size at each spot of the −1…1 ground. Keep the function stable (memoise it). */
  height: (x: number, z: number) => number;
  /**
   * Balls resting on the surface, in ground coordinates; `tone` is a CSS colour (default:
   * accent) and `shape` tells walkers apart without colour (sphere, cone or box).
   */
  markers?: readonly (Spot & { tone?: string; shape?: ClassShape })[];
  /** Soft paths drawn along the surface, such as where each ball has been; `dash` in ground units. */
  trails?: readonly { points: readonly Spot[]; tone: string; dash?: readonly [number, number] }[];
  /** See-through markers, such as where the learner guessed each ball would stop. */
  ghosts?: readonly (Spot & { tone?: string; shape?: ClassShape })[];
  /**
   * A dark rim around every marker and trail (a CSS colour), so they stand out from every part
   * of the warm-to-cool ground, whatever their own tone.
   */
  rim?: string;
  /** Lets the learner turn the valley by dragging (picking is off meanwhile). */
  orbit?: boolean;
  /** Called with the camera's angle around the valley, in radians, as it is turned. */
  onTurn?: (azimuth: number) => void;
  /** Called with the spot on the ground the learner taps, or drops the ring on by keyboard. */
  onPick?: (at: Spot) => void;
  /** Words for the keyboard drop spot, needed with `onPick`. */
  pickWords?: { label: string; instructions: string };
  label: string;
  resolution?: number;
  camera?: { position: Vec3; target?: Vec3 };
  className?: string;
};

/** How tall the tallest hill is, in ground units. */
const RELIEF = 0.7;
const BALL = 0.05;
/** The rim is this much bigger than its marker. */
const RIM = 1.4;
const GHOST_OPACITY = 0.45;
/** How far the valley can be turned: never under the ground or straight overhead. */
const ORBIT = { minPolar: 0.15, maxPolar: 1.3, minDistance: 1.8, maxDistance: 4.5 };
/** Trails float just above the ground so it never hides them. */
const TRAIL_LIFT = 0.012;
const TRAIL_OPACITY = 0.85;
/** The keyboard drop spot moves this far per arrow press and stays this far inside the edge. */
const SPOT_STEP = 0.1;
const SPOT_EDGE = 0.9;

const toColour = (rgb: Rgb | undefined) =>
  rgb ? new Color().setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, SRGBColorSpace) : undefined;

const clampSpot = (value: number) =>
  Math.min(SPOT_EDGE, Math.max(-SPOT_EDGE, Math.round(value * 100) / 100));

/** Arrow keys move the drop spot over the ground: up is away from the viewer. */
const SPOT_MOVES: Record<string, [number, number]> = {
  ArrowLeft: [-SPOT_STEP, 0],
  ArrowRight: [SPOT_STEP, 0],
  ArrowUp: [0, -SPOT_STEP],
  ArrowDown: [0, SPOT_STEP],
};

function Marker({ shape = "circle" }: { shape?: ClassShape }) {
  if (shape === "triangle") return <coneGeometry args={[BALL, BALL * 2.2, 24]} />;
  if (shape === "square") return <boxGeometry args={[BALL * 1.6, BALL * 1.6, BALL * 1.6]} />;
  return <sphereGeometry args={[BALL, 24, 16]} />;
}

/** The rolling-downhill terrain: higher means a bigger mistake, and warmer too. */
export function LossLandscape({
  height,
  markers = [],
  trails = [],
  ghosts = [],
  rim,
  orbit = false,
  onTurn,
  onPick,
  pickWords,
  label,
  resolution = 64,
  camera = { position: [0, 1.9, 2.4] },
  className = "",
}: LossLandscapeProps) {
  const table = useColourTable(warmth);
  const instructionsId = useId();
  const [spot, setSpot] = useState<Spot | null>(null);
  // A tap focuses the control too; the ring is only for keyboard use.
  const tapping = useRef(false);
  const tones = [
    "var(--color-accent)",
    "var(--color-ink)",
    ...markers.map(({ tone }) => tone ?? "var(--color-accent)"),
    ...trails.map(({ tone }) => tone),
    ...ghosts.map(({ tone }) => tone ?? "var(--color-accent)"),
    rim ?? "var(--color-ink)",
  ];
  const resolved = useResolvedColours(tones);
  const colours = useMemo(() => resolved.map(toColour), [resolved]);
  const [accent, ink] = colours;
  const rimColour = rim ? colours.at(-1) : undefined;
  const ghostColour = (index: number) => colours[markers.length + trails.length + index + 2];

  const { geometry, lift } = useMemo(() => {
    const plane = new PlaneGeometry(2, 2, resolution, resolution);
    plane.rotateX(-Math.PI / 2);
    const positions = plane.attributes.position;
    if (!positions) return { geometry: plane, lift: () => 0 };
    const heights = Array.from({ length: positions.count }, (_, i) =>
      height(positions.getX(i), positions.getZ(i)),
    );
    const low = Math.min(...heights);
    const span = Math.max(...heights) - low || 1;
    const colour = new Color();
    const colours = new Float32Array(positions.count * 3);
    heights.forEach((value, i) => {
      const level = (value - low) / span;
      positions.setY(i, level * RELIEF);
      const at = Math.round(level * 255) * 3;
      colour.setRGB(
        (table[at] ?? 0) / 255,
        (table[at + 1] ?? 0) / 255,
        (table[at + 2] ?? 0) / 255,
        SRGBColorSpace,
      );
      colour.toArray(colours, i * 3);
    });
    plane.setAttribute("color", positions.clone().copyArray(colours));
    plane.computeVertexNormals();
    return {
      geometry: plane,
      lift: (x: number, z: number) => ((height(x, z) - low) / span) * RELIEF,
    };
  }, [height, resolution, table]);
  // A new valley or theme replaces the surface; free the old one on the graphics card (ENG-12).
  useEffect(() => () => geometry.dispose(), [geometry]);

  const pick = onPick
    ? (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onPick({ x: event.point.x, z: event.point.z });
      }
    : undefined;

  const onKeyDown = (event: KeyboardEvent) => {
    const at = spot ?? { x: 0, z: 0 };
    const move = SPOT_MOVES[event.key];
    if (move) {
      event.preventDefault();
      setSpot({ x: clampSpot(at.x + move[0]), z: clampSpot(at.z + move[1]) });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPick?.(at);
    }
  };

  const stage = (
    <SoftStage
      label={label}
      camera={camera}
      className={className}
      fallback={
        <ValleyMap
          height={height}
          markers={markers}
          trails={trails}
          ghosts={ghosts}
          cursor={spot}
          label={label}
        />
      }
    >
      <mesh geometry={geometry} onClick={pick}>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>
      {markers.map(({ x, z, shape }, index) => (
        <group key={index} position={[x, lift(x, z) + BALL, z]}>
          <mesh>
            <Marker shape={shape} />
            <meshStandardMaterial color={colours[index + 2]} roughness={0.8} metalness={0} />
          </mesh>
          {rimColour && (
            <mesh scale={RIM}>
              <Marker shape={shape} />
              <meshBasicMaterial color={rimColour} side={BackSide} />
            </mesh>
          )}
        </group>
      ))}
      {ghosts.map(({ x, z, shape }, index) => (
        <mesh key={index} position={[x, lift(x, z) + BALL, z]}>
          <Marker shape={shape} />
          <meshBasicMaterial
            color={ghostColour(index) ?? accent}
            transparent
            opacity={GHOST_OPACITY}
            depthWrite={false}
          />
        </mesh>
      ))}
      {trails.map(({ points, dash }, index) => {
        if (points.length < 2) return null;
        const path = points.map(({ x, z }) => [x, lift(x, z) + TRAIL_LIFT, z] as const);
        return (
          <group key={index}>
            {rimColour && <Line points={path} color={rimColour} lineWidth={5} />}
            <Line
              points={path}
              color={colours[markers.length + index + 2] ?? accent}
              lineWidth={3}
              dashed={Boolean(dash)}
              dashSize={dash?.[0]}
              gapSize={dash?.[1]}
              transparent={!rimColour}
              opacity={rimColour ? 1 : TRAIL_OPACITY}
            />
          </group>
        );
      })}
      {orbit && (
        <OrbitControls
          makeDefault
          enableDamping
          enablePan={false}
          target={camera.target ? [...camera.target] : [0, 0, 0]}
          minPolarAngle={ORBIT.minPolar}
          maxPolarAngle={ORBIT.maxPolar}
          minDistance={ORBIT.minDistance}
          maxDistance={ORBIT.maxDistance}
          onChange={(event) => onTurn?.(event?.target.getAzimuthalAngle() ?? 0)}
        />
      )}
      {spot && (
        <mesh
          position={[spot.x, lift(spot.x, spot.z) + TRAIL_LIFT * 2, spot.z]}
          rotation-x={-Math.PI / 2}
        >
          <ringGeometry args={[0.07, 0.095, 32]} />
          <meshBasicMaterial color={ink} />
        </mesh>
      )}
    </SoftStage>
  );

  if (!onPick || !pickWords) return stage;
  return (
    <div
      role="application"
      tabIndex={0}
      aria-label={pickWords.label}
      aria-describedby={instructionsId}
      onKeyDown={onKeyDown}
      onPointerDown={() => {
        tapping.current = true;
      }}
      onFocus={() => {
        if (!tapping.current) setSpot((at) => at ?? { x: 0, z: 0 });
        tapping.current = false;
      }}
      onBlur={() => setSpot(null)}
      data-drop-spot-control
      className="rounded-card"
    >
      {stage}
      <p id={instructionsId} hidden>
        {pickWords.instructions}
      </p>
    </div>
  );
}
