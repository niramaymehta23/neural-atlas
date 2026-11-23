"use client";

import { Html } from "@react-three/drei";
import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { HoverNote } from "@/ui/HoverNote";
import { constellationCaptions as captions } from "./captions";
import { extraPlaces } from "./layout";

/** A star that is not an idea: something earned elsewhere on the site. */
export type ExtraStar = {
  id: string;
  title: string;
  href: string;
  /** Its picture, drawn to fill its box. */
  mark: ReactNode;
};

const PLACES = extraPlaces();

/** The earned stars, in a sky along the map's far edge, each a link with its name on hover and focus. */
export function ExtraStars({
  extras,
  overlay,
}: {
  extras: readonly ExtraStar[];
  overlay: RefObject<HTMLElement>;
}) {
  return extras.slice(0, PLACES.length).map(({ id, title, href, mark }, at) => (
    <group key={id} position={PLACES[at] ?? [0, 0, 0]}>
      <Html portal={overlay} center zIndexRange={[10, 0]}>
        <HoverNote note={captions.extra(title)}>
          <Link
            href={href}
            prefetch={false}
            aria-label={captions.extra(title)}
            data-achievement={id}
            className="pointer-events-auto flex size-6 items-center justify-center rounded-pill md:size-7"
          >
            <span aria-hidden className="size-3.5 md:size-5">
              {mark}
            </span>
          </Link>
        </HoverNote>
      </Html>
    </group>
  ));
}
