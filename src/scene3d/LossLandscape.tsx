"use client";

import { useMemo } from "react";
import { Color, PlaneGeometry, SRGBColorSpace } from "three";
import { warmth } from "@/design/encodings";
import { useColourTable, useResolvedColours } from "@/design/paint";
import type { Vec3 } from "./CameraRig";
import { SoftStage } from "./SoftStage";

type LossLandscapeProps = {
  /** Mistake size at each spot of the −1…1 ground. Keep the function stable (memoise it). */
  height: (x: number, z: number) => number;
  /** Balls resting on the surface, in ground coordinates. */
  markers?: readonly { x: number; z: number }[];
  label: string;
  resolution?: number;
  camera?: { position: Vec3; target?: Vec3 };
  className?: string;
};

/** How tall the tallest hill is, in ground units. */
const RELIEF = 0.7;
const BALL = 0.05;

/** The rolling-downhill terrain: higher means a bigger mistake, and warmer too. */
export function LossLandscape({
  height,
  markers = [],
  label,
  resolution = 64,
  camera = { position: [0, 1.9, 2.4] },
  className = "",
}: LossLandscapeProps) {
  const table = useColourTable(warmth);
  const [ball] = useResolvedColours(["var(--color-accent)"]);

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

  const ballColour = useMemo(
    () =>
      ball
        ? new Color().setRGB(ball[0] / 255, ball[1] / 255, ball[2] / 255, SRGBColorSpace)
        : undefined,
    [ball],
  );

  return (
    <SoftStage label={label} camera={camera} className={className}>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>
      {markers.map(({ x, z }, index) => (
        <mesh key={index} position={[x, lift(x, z) + BALL, z]}>
          <sphereGeometry args={[BALL, 24, 16]} />
          <meshStandardMaterial color={ballColour} roughness={0.8} metalness={0} />
        </mesh>
      ))}
    </SoftStage>
  );
}
