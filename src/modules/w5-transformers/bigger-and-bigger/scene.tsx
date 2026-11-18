"use client";

import { useMemo } from "react";
import { useShownFrame } from "@/features/language/use-shown-frame";
import type { ModuleViewProps } from "@/platform/contract";
import { bigNumber, words } from "./captions";
import {
  affordable,
  frameOf,
  LIMITS,
  lopsided,
  surprise,
  type ScaleFrame,
  type ScaleState,
} from "./model";

type Props = ModuleViewProps<ScaleState, ScaleFrame>;

const WIDTH = 520;
const HEIGHT = 260;
const PAD = { left: 24, right: 24, top: 20, bottom: 36 };
const TOP_LOSS = 6;
const LOW_LOSS = 1.6;

/** The writer you planned, the best plan for the same computing, and the curve between them. */
export function ScaleScene({ state, timeline }: Props) {
  const frame = useMemo(() => frameOf(state), [state]);
  useShownFrame(timeline, frame);
  const x = (brain: number) =>
    PAD.left +
    ((brain - LIMITS.brain.min) / (LIMITS.brain.max - LIMITS.brain.min)) *
      (WIDTH - PAD.left - PAD.right);
  const y = (loss: number) =>
    PAD.top +
    ((Math.min(TOP_LOSS, loss) - LOW_LOSS) / (TOP_LOSS - LOW_LOSS)) *
      (HEIGHT - PAD.top - PAD.bottom);
  const curve = Array.from({ length: 61 }, (_, at) => {
    const brain = LIMITS.brain.min + (at / 60) * (LIMITS.brain.max - LIMITS.brain.min);
    return `${x(brain).toFixed(1)},${y(surprise(brain, affordable(brain, state.budget))).toFixed(1)}`;
  }).join(" ");
  const you = { x: x(state.brain), y: y(frame.loss) };
  const best = {
    x: x(Math.min(LIMITS.brain.max, Math.max(LIMITS.brain.min, frame.bestBrain))),
    y: y(frame.best),
  };

  return (
    <div className="flex grow flex-col gap-3" data-testid="bigger-and-bigger">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={words.picture}
        className="h-auto w-full rounded-card border border-hairline bg-paper"
      >
        <polyline
          points={curve}
          fill="none"
          className="stroke-ink-soft"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        <path d={starPath(best.x, best.y)} className="fill-sand stroke-ink" strokeWidth={1.5} />
        <text x={best.x} y={best.y + 22} textAnchor="middle" className="fill-ink-soft text-[12px]">
          {words.bestMark}
        </text>
        <circle cx={you.x} cy={you.y} r={7} className="fill-accent stroke-ink" strokeWidth={1.5} />
        <text x={you.x + 10} y={you.y - 8} className="fill-ink text-[12px]">
          {words.you}
        </text>
        <text x={PAD.left} y={HEIGHT - 10} className="fill-ink-soft text-[12px]">
          {words.axis.smaller}
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 10}
          textAnchor="end"
          className="fill-ink-soft text-[12px]"
        >
          {words.axis.bigger}
        </text>
        <text
          x={WIDTH - PAD.right}
          y={PAD.top}
          textAnchor="end"
          className="fill-ink-soft text-[12px]"
        >
          {words.axis.better}
        </text>
      </svg>
      <div
        className="flex min-h-20 flex-col gap-1 text-sm"
        data-lopsided={lopsided(frame) ? "" : undefined}
      >
        <p className="font-semibold">{words.yours(words.quality(frame.loss))}</p>
        <p>{words.bestLine(words.quality(frame.best))}</p>
        <p className="text-ink-soft">
          {frame.spent ? words.ranOut(bigNumber(frame.read)) : words.leftOver}
          {lopsided(frame) ? ` ${words.lopsided}` : ""}
        </p>
      </div>
    </div>
  );
}

function starPath(cx: number, cy: number) {
  return (
    Array.from({ length: 10 }, (_, at) => {
      const radius = at % 2 === 0 ? 10 : 4.5;
      const angle = (Math.PI / 5) * at - Math.PI / 2;
      return `${at === 0 ? "M" : "L"}${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`;
    }).join(" ") + " Z"
  );
}
