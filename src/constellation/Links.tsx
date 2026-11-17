"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, type Color } from "three";
import { floatOffset, type Link, type Star } from "./layout";

type LinksProps = {
  stars: readonly Star[];
  links: readonly Link[];
  colour: Color;
  /** Full strength, or faded back when these lines belong to groups not picked. */
  opacity: number;
  still: boolean;
};

/** Thin warm lines from each idea to the ones it builds on, riding along as the groups bob. */
export function Links({ stars, links, colour, opacity, still }: LinksProps) {
  const invalidate = useThree((state) => state.invalidate);
  const geometry = useMemo(() => {
    const lines = new BufferGeometry();
    lines.setAttribute("position", new BufferAttribute(new Float32Array(links.length * 6), 3));
    return lines;
  }, [links.length]);

  const place = useMemo(
    () => (seconds: number) => {
      const positions = geometry.getAttribute("position");
      links.forEach(({ from, to }, at) => {
        [from, to].forEach((index, end) => {
          const star = stars[index];
          if (!star) return;
          const [x, y, z] = star.position;
          const bob = still ? 0 : floatOffset(star.lesson.world, seconds);
          positions.setXYZ(at * 2 + end, x, y + bob, z);
        });
      });
      positions.needsUpdate = true;
    },
    [geometry, links, stars, still],
  );

  useLayoutEffect(() => {
    place(0);
    invalidate();
  }, [place, invalidate]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    if (!still) place(clock.elapsedTime);
  });

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={colour} transparent opacity={opacity} />
    </lineSegments>
  );
}
