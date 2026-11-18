"use client";

import { useMemo, type ReactNode } from "react";
import { motion } from "motion/react";
import { count, sentenceStart } from "@/design/copy";
import { classTone, markPath } from "@/design/encodings";
import { useReducedMotion, useSpring } from "@/design/motion";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  allSame,
  BADGES,
  clubOf,
  FRIENDSHIPS,
  leanOf,
  PEOPLE,
  rightGuesses,
  spreadOf,
  UNBADGED,
  viewsAfter,
  type FriendsState,
} from "./model";

type Props = ModuleViewProps<FriendsState>;

const WIDTH = 320;
const HEIGHT = 220;
const RADIUS = 13;
const SHAPES = ["triangle", "square"] as const;
/** Spread below this (but not yet the same): the groups are blending. */
const BLENDING = 0.3;

/** Where each friend sits: club 0's group on the left, club 1's on the right. */
const PLACES = Array.from({ length: PEOPLE }, (_, person) => {
  const left = clubOf(person) === 0;
  const index = person % (PEOPLE / 2);
  const angle = (index / (PEOPLE / 2)) * 2 * Math.PI + (left ? 0 : Math.PI);
  const cx = left ? 88 : 232;
  return {
    x: Math.round((cx + 62 * Math.cos(angle)) * 100) / 100,
    y: Math.round((110 + 78 * Math.sin(angle)) * 100) / 100,
  };
});

const isBadge = (person: number) => (BADGES as readonly number[]).includes(person);
const placeOf = (person: number) => PLACES[person] ?? { x: 0, y: 0 };

/** How the network's views stand, in words. */
export function howTheyStand(views: readonly number[]) {
  if (allSame(views)) return words.same;
  return spreadOf(views) < BLENDING ? words.close : words.apart;
}

/** What the people without a badge think, in words. */
export function rightLine(views: readonly number[], rounds: number) {
  if (rounds === 0) return words.start;
  return sentenceStart(words.right(count(rightGuesses(views)), count(UNBADGED)));
}

/** The friendship network: every friend's view, pulses along friendships each round. */
export function FriendsScene({ state }: Props) {
  const views = useMemo(() => viewsAfter(state.listen, state.rounds), [state.listen, state.rounds]);
  const reduced = useReducedMotion();
  const travel = useSpring("settle");
  const same = allSame(views);

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="learning-from-friends"
      data-rounds={state.rounds}
    >
      <figure className="flex flex-col gap-1">
        <svg
          role="img"
          aria-label={words.picture}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full rounded-card border border-hairline bg-paper"
        >
          {FRIENDSHIPS.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={placeOf(a).x}
              y1={placeOf(a).y}
              x2={placeOf(b).x}
              y2={placeOf(b).y}
              stroke="var(--color-hairline)"
              strokeWidth={1.5}
            />
          ))}
          {!reduced &&
            state.rounds > 0 &&
            FRIENDSHIPS.flatMap(([a, b]) => [
              [a, b],
              [b, a],
            ]).map(([from = 0, to = 0]) => (
              <motion.circle
                // A new round sends a new set of pulses.
                key={`${state.rounds}-${from}-${to}`}
                r={2.5}
                fill="var(--color-flow)"
                stroke="var(--color-ink)"
                strokeWidth={0.5}
                initial={{ cx: placeOf(from).x, cy: placeOf(from).y, opacity: 1 }}
                animate={{ cx: placeOf(to).x, cy: placeOf(to).y, opacity: 0 }}
                transition={travel}
                data-pulse
              />
            ))}
          {views.map((view, person) => {
            const { x, y } = placeOf(person);
            const lean = leanOf(view);
            const size = 3 + Math.min(1, Math.abs(view)) * 5;
            return (
              <g key={person} data-person={person} data-lean={lean ?? "none"}>
                <circle
                  cx={x}
                  cy={y}
                  r={RADIUS}
                  fill="var(--color-card)"
                  stroke="var(--color-ink)"
                  strokeWidth={1.2}
                />
                {isBadge(person) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={RADIUS - 3}
                    fill="none"
                    stroke="var(--color-ink)"
                    strokeWidth={1}
                  />
                )}
                {lean !== null ? (
                  <path
                    d={markPath(SHAPES[lean], x, y, size)}
                    fill={classTone(lean)}
                    stroke="var(--color-ink)"
                    strokeWidth={0.8}
                  />
                ) : (
                  <circle cx={x} cy={y} r={2} fill="var(--color-ink-soft)" />
                )}
              </g>
            );
          })}
        </svg>
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          <KeyItem label={words.key.badge}>
            <circle cx={6} cy={6} r={5} fill="none" stroke="var(--color-ink)" />
            <circle cx={6} cy={6} r={3} fill="none" stroke="var(--color-ink)" />
          </KeyItem>
          <KeyItem label={words.key.triangle}>
            <path d={markPath("triangle", 6, 6, 4)} fill={classTone(0)} stroke="var(--color-ink)" />
          </KeyItem>
          <KeyItem label={words.key.square}>
            <path d={markPath("square", 6, 6, 4)} fill={classTone(1)} stroke="var(--color-ink)" />
          </KeyItem>
          <KeyItem label={words.key.unsure}>
            <circle cx={6} cy={6} r={2} fill="var(--color-ink-soft)" />
          </KeyItem>
        </figcaption>
      </figure>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-16 flex-col gap-1 text-sm">
        <p data-right>{rightLine(views, state.rounds)}</p>
        <p className="text-ink-soft" data-same={same || undefined}>
          {state.rounds === 0 ? "" : howTheyStand(views)}
        </p>
      </div>
    </div>
  );
}

function KeyItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
        {children}
      </svg>
      {label}
    </span>
  );
}
