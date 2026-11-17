"use client";

import { DrawerText } from "@/features/classic/DrawerText";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { curveOf, sortOf, type SortState } from "./model";

const { drawer } = words;

/** The three scores explained, every setting on one curve with the learner's marked, the maths. */
export function SortDrawer({ state }: ModuleViewProps<SortState>) {
  const { curve } = curveOf(state);
  const { counts } = sortOf(state);
  const fine = counts.falseAlarm + counts.clear;
  const wormy = counts.caught + counts.missed;
  const here = {
    x: fine ? counts.falseAlarm / fine : 0,
    y: wormy ? counts.caught / wormy : 0,
  };
  const path = curve
    .map((point, index) => `${index ? "L" : "M"}${point.falseAlarms} ${1 - point.caught}`)
    .join(" ");
  return (
    <>
      <DrawerText
        sections={[
          {
            title: drawer.mechanics,
            paragraphs: [drawer.right, drawer.caught, drawer.trust, drawer.trade],
          },
        ]}
      />
      <figure className="my-3 flex flex-col gap-1">
        <svg
          viewBox="-0.05 -0.05 1.1 1.1"
          role="img"
          aria-label={drawer.curve}
          className="aspect-square w-48 rounded-card border border-hairline bg-paper"
        >
          <path
            d="M0 1 L1 0"
            stroke="var(--color-hairline)"
            strokeWidth={0.01}
            strokeDasharray="0.03 0.03"
          />
          <path d={path} fill="none" stroke="var(--color-ink)" strokeWidth={0.015} />
          <circle
            cx={here.x}
            cy={1 - here.y}
            r={0.04}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={0.02}
          />
        </svg>
        <figcaption className="text-xs text-ink-soft">{drawer.curve}</figcaption>
      </figure>
      <DrawerText sections={[{ title: drawer.maths, paragraphs: [drawer.formula] }]} />
    </>
  );
}
