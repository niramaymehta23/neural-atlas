"use client";

import type { Branch } from "@/engine/rl/mcts";
import { Disc } from "./Disc";
import { IT, YOU } from "./model";

const ROOT = { x: 100, y: 118 };
/** Its moves fan over this arc, left column on the left, like the board above. */
const FAN = { from: 168, to: 12 };
/** Replies fan this far either side of the move they answer, then answers to those. */
const SPREAD = [0, 64, 34];
/** Twigs thinner than this share of all its games are left out, so the picture stays light. */
const FAINTEST = 0.004;

type Twig = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  tip?: number;
  top: boolean;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const round = (value: number) => Math.round(value * 100) / 100;

/** Lines for every imagined move, thicker and longer the more games went through it. */
function grow(branches: readonly Branch[], total: number, favourite: number): Twig[] {
  const twigs: Twig[] = [];
  const walk = (
    level: readonly Branch[],
    from: { x: number; y: number },
    angle: number,
    depth: number,
    path: string,
  ) => {
    level.forEach((branch) => {
      const share = total > 0 ? branch.visits / total : 0;
      if (branch.visits === 0 || (depth > 0 && share < FAINTEST)) return;
      const heading =
        depth === 0
          ? FAN.from + ((FAN.to - FAN.from) * branch.column) / 6
          : angle + ((branch.column - 3) / 3) * (SPREAD[depth] ?? 20);
      const reach =
        [26 + 38 * Math.sqrt(share), 9 + 22 * Math.sqrt(share), 5 + 13 * Math.sqrt(share)][depth] ??
        4;
      // Rounded, so the picture is the same wherever the maths ran.
      const to = {
        x: round(from.x + Math.cos(toRadians(heading)) * reach),
        y: round(from.y - Math.sin(toRadians(heading)) * reach),
      };
      const key = `${path}${branch.column}`;
      twigs.push({
        key,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        width: round([1 + 9 * share, 0.6 + 7 * share, 0.4 + 5 * share][depth] ?? 0.4),
        tip: depth === 0 ? IT : depth === 1 && share >= 0.02 ? YOU : undefined,
        top: depth === 0 && branch.column === favourite,
      });
      walk(branch.children, to, heading, depth + 1, `${key}-`);
    });
  };
  walk(branches, ROOT, 90, 0, "");
  return twigs;
}

type BloomProps = {
  branches: readonly Branch[];
  /** Games it will imagine in all, so branches thicken as the games pile up. */
  total: number;
  /** Its favourite column, drawn in full ink (−1: none yet). */
  favourite: number;
  label: string;
};

/** The tree of imagined games, blooming upwards from the board as it is now. */
export function Bloom({ branches, total, favourite, label }: BloomProps) {
  const twigs = grow(branches, total, favourite);
  return (
    <svg role="img" aria-label={label} viewBox="0 0 200 122" className="h-auto w-full" data-bloom>
      {twigs.map((twig) => (
        <line
          key={twig.key}
          x1={twig.x1}
          y1={twig.y1}
          x2={twig.x2}
          y2={twig.y2}
          stroke={twig.top ? "var(--color-ink)" : "var(--color-ink-soft)"}
          strokeWidth={twig.width}
          strokeLinecap="round"
        />
      ))}
      {twigs.map((twig) =>
        twig.tip === undefined ? null : (
          <Disc
            key={`${twig.key}-tip`}
            player={twig.tip}
            x={twig.x2}
            y={twig.y2}
            r={twig.tip === IT ? 3.2 : 2.2}
          />
        ),
      )}
      {branches.map((branch) => (
        <g key={branch.column} data-branch={branch.column} data-visits={branch.visits} />
      ))}
      <circle cx={ROOT.x} cy={ROOT.y} r={3} fill="var(--color-ink)" />
    </svg>
  );
}
