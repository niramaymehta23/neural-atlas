"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { count, sentenceStart } from "@/design/copy";
import { useSpring } from "@/design/motion";
import { curveAt } from "@/engine/fit/least-squares";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  BOARD,
  dartOf,
  grouping,
  offBoard,
  robotsOf,
  scatterOf,
  SPOTS,
  wave,
  type DartsState,
} from "./model";

type Props = ModuleViewProps<DartsState>;

const SIZE = 200;
const MIDDLE = SIZE / 2;
const REACH = SIZE / 2 - 10;
const CURVE = { width: 320, height: 200, top: 1.6 };
const XS = Array.from({ length: 61 }, (_, index) => -1 + index / 30);
/** The darts' middle this close to the bullseye counts as near it. */
const NEAR = 0.3;

const curveX = (x: number) => 8 + ((x + 1) / 2) * (CURVE.width - 16);
const curveY = (y: number) =>
  CURVE.height / 2 -
  (Math.max(-CURVE.top, Math.min(CURVE.top, y)) / CURVE.top) * (CURVE.height / 2 - 6);
const pathOf = (at: (x: number) => number) =>
  XS.map(
    (x, index) => `${index === 0 ? "M" : "L"}${curveX(x).toFixed(1)} ${curveY(at(x)).toFixed(1)}`,
  ).join(" ");

/** Where a dart lands on the board; one beyond it rests on the rim. */
function boardSpot(across: number, up: number) {
  const far = Math.hypot(across, up);
  const scale = far > BOARD ? BOARD / far : 1;
  return {
    x: MIDDLE + ((across * scale) / BOARD) * REACH,
    y: MIDDLE - ((up * scale) / BOARD) * REACH,
    missed: far > BOARD,
  };
}

const DART = "M0 -6 L4 0 L0 6 L-4 0 Z";

/** The words under the board: how the darts are grouped, and where. */
export function boardSentence(state: DartsState): string {
  const darts = robotsOf(state).map(dartOf);
  const { off, spread } = grouping(darts);
  return words.describe(
    words.scatter[scatterOf(spread)],
    off < NEAR ? words.centre.near : words.centre.far,
  );
}

/** The dart board and, beside it, every robot's curve over the true wave. */
export function DartsScene({ state }: Props) {
  const transition = useSpring("settle");
  const robots = useMemo(() => robotsOf(state), [state]);
  const darts = robots.map(dartOf);
  const missed = offBoard(darts);
  return (
    <div className="flex grow flex-col gap-3" data-testid="stubborn-vs-jumpy">
      <div className="grid gap-3 md:grid-cols-2">
        <svg
          role="img"
          aria-label={words.board}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto h-auto w-full max-w-xs"
        >
          {[1, 2 / 3, 1 / 3].map((ring) => (
            <circle
              key={ring}
              cx={MIDDLE}
              cy={MIDDLE}
              r={REACH * ring}
              fill={ring === 1 ? "var(--color-card)" : "none"}
              stroke="var(--color-ink-soft)"
              strokeWidth={1}
            />
          ))}
          <circle cx={MIDDLE} cy={MIDDLE} r={6} fill="var(--color-ink)" data-bullseye />
          {darts.map(({ across, up }, index) => {
            const at = boardSpot(across, up);
            return (
              <motion.g
                key={index}
                initial={false}
                animate={{ x: at.x, y: at.y }}
                transition={transition}
                data-dart={at.missed ? "missed" : "on"}
              >
                <path
                  d={DART}
                  fill={at.missed ? "var(--color-paper)" : "var(--color-flow)"}
                  stroke="var(--color-ink)"
                  strokeWidth={1.2}
                />
              </motion.g>
            );
          })}
        </svg>
        <svg
          role="img"
          aria-label={words.curves}
          viewBox={`0 0 ${CURVE.width} ${CURVE.height}`}
          className="h-auto w-full rounded-card border border-hairline bg-paper"
        >
          {SPOTS.map((spot) => (
            <line
              key={spot}
              x1={curveX(spot)}
              x2={curveX(spot)}
              y1={4}
              y2={CURVE.height - 4}
              stroke="var(--color-ink-soft)"
              strokeDasharray="1 3"
            />
          ))}
          {robots.map((weights, index) => (
            <path
              key={index}
              d={pathOf((x) => curveAt(weights, x))}
              fill="none"
              stroke="var(--color-flow)"
              strokeOpacity={0.6}
              strokeWidth={1.2}
            />
          ))}
          <path
            d={pathOf(wave)}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth={2.2}
            strokeDasharray="6 4"
          />
        </svg>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        <li>{words.key.dart}</li>
        <li>{words.key.wave}</li>
        <li>{words.key.robot}</li>
        <li>{words.key.spots}</li>
      </ul>
      {/* Reserved lines, so the page does not jump when the words change. */}
      <div className="flex min-h-12 flex-col gap-1 text-sm" data-board-words>
        <p>{boardSentence(state)}</p>
        {missed > 0 && (
          <p className="text-ink-soft">
            {sentenceStart(words.missed(count(missed), missed === 1))}
          </p>
        )}
      </div>
    </div>
  );
}
