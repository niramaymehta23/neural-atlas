"use client";

import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { Color, PlaneGeometry, SRGBColorSpace } from "three";
import { warmth } from "@/design/encodings";
import { useColourTable, useResolvedColours, type Rgb } from "@/design/paint";
import type { Vec3 } from "./CameraRig";
import { SoftStage } from "./SoftStage";

type LossLandscapeProps = {
  /** Mistake size at each spot of the −1…1 ground. Keep the function stable (memoise it). */
  height: (x: number, z: number) => number;
  /** Balls resting on the surface, in ground coordinates; `tone` is a CSS colour (default: accent). */
  markers?: readonly { x: number; z: number; tone?: string }[];
  /** Soft paths drawn along the surface, such as where each ball has been. */
  trails?: readonly { points: readonly { x: number; z: number }[]; tone: string }[];
  /** Called with the spot on the ground the learner taps. */
  onPick?: (at: { x: number; z: number }) => void;
  label: string;
  resolution?: number;
  camera?: { position: Vec3; target?: Vec3 };
  className?: string;
};

/** How tall the tallest hill is, in ground units. */
const RELIEF = 0.7;
const BALL = 0.05;
/** Trails float just above the ground so it never hides them. */
const TRAIL_LIFT = 0.012;
const TRAIL_OPACITY = 0.6;

const toColour = (rgb: Rgb | undefined) =>
  rgb ? new Color().setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, SRGBColorSpace) : undefined;

/** The rolling-downhill terrain: higher means a bigger mistake, and warmer too. */
export function LossLandscape({
  height,
  markers = [],
  trails = [],
  onPick,
  label,
  resolution = 64,
  camera = { position: [0, 1.9, 2.4] },
  className = "",
}: LossLandscapeProps) {
  const table = useColourTable(warmth);
  const tones = [
    "var(--color-accent)",
    ...markers.map(({ tone }) => tone ?? "var(--color-accent)"),
    ...trails.map(({ tone }) => tone),
  ];
  const resolved = useResolvedColours(tones);
  const colours = useMemo(() => resolved.map(toColour), [resolved]);

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

  const pick = onPick
    ? (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onPick({ x: event.point.x, z: event.point.z });
      }
    : undefined;

  return (
    <SoftStage label={label} camera={camera} className={className}>
      <mesh geometry={geometry} onClick={pick}>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>
      {markers.map(({ x, z }, index) => (
        <mesh key={index} position={[x, lift(x, z) + BALL, z]}>
          <sphereGeometry args={[BALL, 24, 16]} />
          <meshStandardMaterial color={colours[index + 1]} roughness={0.8} metalness={0} />
        </mesh>
      ))}
      {trails.map(({ points }, index) =>
        points.length < 2 ? null : (
          <Line
            key={index}
            points={points.map(({ x, z }) => [x, lift(x, z) + TRAIL_LIFT, z] as const)}
            color={colours[markers.length + index + 1] ?? colours[0]}
            lineWidth={3}
            transparent
            opacity={TRAIL_OPACITY}
          />
        ),
      )}
    </SoftStage>
  );
}
