"use client";

import { useMemo } from "react";
import { useShownFrame } from "@/features/language/use-shown-frame";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  blurred,
  frameOf,
  riverOf,
  SENTENCE,
  stagesOf,
  type BlockFrame,
  type BlockState,
} from "./model";

type Props = ModuleViewProps<BlockState, BlockFrame>;

const WIDTH = 560;
const HEIGHT = 260;
const LEFT = 64;
const RIGHT = 24;
const TOP = 28;
const BOTTOM = 20;
const DASHES = ["", "6 3", "2 3", "8 3 2 3", "1 2", "10 4"];

/** The river of words through the blocks, and how alike the words end up. */
export function BlockScene({ state, timeline }: Props) {
  const frame = useMemo(() => frameOf(state), [state]);
  useShownFrame(timeline, frame);
  const river = useMemo(() => riverOf(stagesOf(state)), [state]);
  const stages = river.length;
  const x = (stage: number) => LEFT + (stage / Math.max(1, stages - 1)) * (WIDTH - LEFT - RIGHT);
  const y = (value: number) => TOP + ((1 - value) / 2) * (HEIGHT - TOP - BOTTOM);
  const end = frame.alike.at(-1) ?? 0;

  return (
    <div className="flex grow flex-col gap-3" data-testid="the-thinking-block">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={words.river}
        className="h-auto w-full rounded-card border border-hairline bg-paper"
      >
        {Array.from({ length: stages - 1 }, (_, at) => (
          <g key={at}>
            <rect
              x={x(at + 0.5) - 6}
              y={TOP - 4}
              width={12}
              height={HEIGHT - TOP - BOTTOM + 8}
              rx={4}
              className="fill-sand"
            />
            {stages <= 7 && (
              <text
                x={x(at + 0.5)}
                y={16}
                textAnchor="middle"
                className="fill-ink-soft text-[11px]"
              >
                {words.block(at + 1)}
              </text>
            )}
          </g>
        ))}
        {SENTENCE.map((word, w) => (
          <g key={word}>
            <polyline
              points={river.map((stage, at) => `${x(at)},${y(stage[w] ?? 0)}`).join(" ")}
              fill="none"
              className="stroke-ink"
              strokeWidth={2}
              strokeDasharray={DASHES[w]}
              strokeLinejoin="round"
            />
            <text
              x={LEFT - 8}
              y={y(river[0]?.[w] ?? 0) + 4}
              textAnchor="end"
              className="fill-ink text-[12px]"
            >
              {word}
            </text>
          </g>
        ))}
      </svg>
      <div
        className="flex min-h-16 flex-col gap-1 text-sm"
        data-alike={end.toFixed(3)}
        data-blurred={blurred(frame) ? "" : undefined}
      >
        <p>{words.alike(end)}</p>
        <div
          role="meter"
          aria-label={words.meter}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(end * 100)}
          aria-valuetext={words.alike(end)}
          className="h-3 w-full max-w-sm rounded-pill border border-hairline bg-inset"
        >
          <div className="h-full rounded-pill bg-flow" style={{ width: `${end * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
