"use client";

import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Object3D, SRGBColorSpace, type InstancedMesh } from "three";
import { classTone } from "@/design/encodings";
import { useResolvedColours } from "@/design/paint";
import type { Vec3 } from "./CameraRig";
import { SoftStage } from "./SoftStage";

export type IdeaPoint = { position: Vec3; group: number };

type IdeaSpaceProps = {
  points: readonly IdeaPoint[];
  /** Index of the point to glide towards; omitted shows the whole cloud. */
  focus?: number;
  label: string;
  className?: string;
};

const GROUPS = 3;
const DOT = 0.035;
const OVERVIEW: Vec3 = [0, 0.4, 3.2];

/** The cloud itself; lives inside the canvas so it can ask for a redraw after moving dots. */
function Dots({ points, colours }: { points: readonly IdeaPoint[]; colours: readonly Color[] }) {
  const mesh = useRef<InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const instances = mesh.current;
    if (!instances) return;
    const place = new Object3D();
    points.forEach(({ position, group }, index) => {
      place.position.set(...position);
      place.updateMatrix();
      instances.setMatrixAt(index, place.matrix);
      const colour = colours[group % GROUPS];
      if (colour) instances.setColorAt(index, colour);
    });
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    invalidate();
  }, [points, colours, invalidate]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, points.length]}>
      <sphereGeometry args={[DOT, 16, 12]} />
      <meshStandardMaterial roughness={0.9} metalness={0} />
    </instancedMesh>
  );
}

/** A map of ideas in depth: similar things float near each other, and the view glides between them. */
export function IdeaSpace({ points, focus, label, className = "" }: IdeaSpaceProps) {
  const tones = useResolvedColours(Array.from({ length: GROUPS }, (_, group) => classTone(group)));
  const colours = useMemo(
    () => tones.map(([r, g, b]) => new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)),
    [tones],
  );
  const target = focus === undefined ? undefined : points[focus]?.position;
  const camera = target
    ? { position: [target[0] + 0.3, target[1] + 0.2, target[2] + 0.9] as Vec3, target }
    : { position: OVERVIEW };

  return (
    <SoftStage label={label} camera={camera} className={className}>
      <Dots points={points} colours={colours} />
    </SoftStage>
  );
}
