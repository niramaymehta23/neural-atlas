"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { drawingLoop, FLOW_RATE, REST_MS, type DrawingLoop } from "@/design/drawing-loop";
import { speed } from "@/design/encodings";
import { useReducedMotion } from "@/design/motion";
import { createRandom } from "@/engine/random";

/** The words the rain speaks; each lesson passes them from its captions. */
export type RainWords = {
  /** What the picture is, for screen readers. */
  label: string;
  /** Under the leftmost band and the rightmost one. */
  start: string;
  answer: string;
  /** Beside a band whose rain has dried up. */
  dry: string;
};

type GradientRainProps = {
  /** Per layer, input side first: how much blame reaches it (any scale; only shares matter). */
  blame: readonly number[];
  words: RainWords;
};

const WIDTH = 480;
const HEIGHT = 180;
const FLOOR = 150;
const MOST_DROPS = 26;
/** A layer getting less than this share of the answer's blame counts as dry. */
export const DRY_SHARE = 0.01;
const DROP = "M0 -5 Q2.6 0 0 2.6 Q-2.6 0 0 -5 Z";

/** Each layer's blame as a share of the most any layer got, 0–1. */
export function rainShares(blame: readonly number[]): number[] {
  const most = Math.max(0, ...blame.filter(Number.isFinite));
  return blame.map((value) => (most > 0 && Number.isFinite(value) ? Math.max(0, value) / most : 0));
}

/**
 * Gradient rain: blame falls back through the network, one band per layer, answer on the
 * right and the start on the left. More blame means more drops falling faster and a longer
 * puddle under the band; a band that gets almost none is marked dry in words, not just by an
 * empty band. The rain rests while the learner is away or it is out of view, and with reduced
 * motion the drops hang still.
 */
export function GradientRain({ blame, words }: GradientRainProps) {
  const reduced = useReducedMotion();
  const shares = useMemo(() => rainShares(blame), [blame]);
  const bands = useRef<(SVGGElement | null)[]>([]);
  const picture = useRef<SVGSVGElement>(null);
  /** Seconds it has rained: kept when the blame changes or it rests, so the drops never jump. */
  const falling = useRef(0);
  const loop = useRef<DrawingLoop>(null);
  const latest = useRef(shares);
  const clip = useId();
  const count = Math.max(1, shares.length);
  const band = WIDTH / count;
  // Drop spots are seeded, so the picture is the same on every visit and in every test.
  const spots = useMemo(() => {
    const random = createRandom(11);
    return Array.from({ length: MOST_DROPS }, () => ({
      x: random.range(0.15, 0.85),
      y: random.range(0, FLOOR),
    }));
  }, []);

  // New blame wakes the rain, and it carries on falling where it was.
  useEffect(() => {
    latest.current = shares;
    loop.current?.wake();
  }, [shares]);

  useEffect(() => {
    if (reduced) {
      for (const group of bands.current) group?.setAttribute("transform", "translate(0 0)");
      return;
    }
    const draw = (passed: number) => {
      falling.current += passed;
      latest.current.forEach((share, index) => {
        const fall = (falling.current / speed(share)) * FLOOR;
        bands.current[index]?.setAttribute(
          "transform",
          `translate(0 ${(fall % FLOOR).toFixed(1)})`,
        );
      });
    };
    const started = drawingLoop(draw, {
      rate: FLOW_RATE,
      element: picture.current,
      restAfter: REST_MS,
    });
    loop.current = started;
    return () => {
      loop.current = null;
      started();
    };
  }, [reduced]);

  return (
    <svg
      ref={picture}
      role="img"
      aria-label={words.label}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full"
      data-gradient-rain
    >
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={WIDTH} height={FLOOR} />
        </clipPath>
      </defs>
      {shares.map((share, index) => {
        const drops = share < DRY_SHARE ? 0 : Math.max(1, Math.round(share * MOST_DROPS));
        const left = index * band;
        return (
          <g key={index} data-band={index} data-drops={drops}>
            <rect
              x={left + 2}
              y={0}
              width={band - 4}
              height={FLOOR}
              rx={8}
              fill="var(--color-card)"
              stroke="var(--color-hairline)"
            />
            <g clipPath={`url(#${clip})`}>
              <g
                ref={(element) => {
                  bands.current[index] = element;
                }}
              >
                {[0, -FLOOR].map((lift) =>
                  spots
                    .slice(0, drops)
                    .map((spot, drop) => (
                      <path
                        key={`${lift}-${drop}`}
                        d={DROP}
                        transform={`translate(${(left + spot.x * band).toFixed(1)} ${(spot.y + lift).toFixed(1)})`}
                        fill="var(--color-flow)"
                        stroke="var(--color-ink)"
                        strokeWidth={0.6}
                      />
                    )),
                )}
              </g>
            </g>
            {/* The puddle: as long as the share of blame that reached this layer. */}
            <rect
              x={left + 6}
              y={FLOOR + 6}
              width={Math.max(0, (band - 12) * share)}
              height={6}
              rx={3}
              fill="var(--color-ink)"
              data-puddle={share.toFixed(3)}
            />
            {drops === 0 && (
              <text
                x={left + band / 2}
                y={FLOOR / 2}
                textAnchor="middle"
                className="fill-ink-soft text-[13px]"
              >
                {words.dry}
              </text>
            )}
          </g>
        );
      })}
      <text x={4} y={HEIGHT - 2} className="fill-ink-soft text-[12px]">
        {words.start}
      </text>
      <text x={WIDTH - 4} y={HEIGHT - 2} textAnchor="end" className="fill-ink-soft text-[12px]">
        {words.answer}
      </text>
    </svg>
  );
}
