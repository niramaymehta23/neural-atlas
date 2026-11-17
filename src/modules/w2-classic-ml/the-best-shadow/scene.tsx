"use client";

import { outOf } from "@/design/copy";
import { shadowOf, viewDirection, type Vec3 } from "@/engine/ml/pca";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import { cloudOf, shadowPoints, shareOf, tipOf, turnOf, type ShadowState } from "./model";

type Props = ModuleViewProps<ShadowState>;

/** The fixed spot the 3D cloud is seen from, a little to the side and above. */
const CAMERA = { turn: 0.6, tip: 0.35 };
const TORCH = 1.35;
const DOT = 0.03;

const seen = (points: readonly Vec3[]) => shadowOf(points, CAMERA.turn, CAMERA.tip);

/** The cloud in the air with the torch's beam, and the shadow it casts on the wall. */
export function ShadowScene({ state }: Props) {
  const cloud = seen(cloudOf(state.cloud));
  const direction = viewDirection(turnOf(state.turn), tipOf(state.tip));
  const [[torchX, torchY] = [0, 0], [tailX, tailY] = [0, 0]] = seen([
    [direction[0] * TORCH, direction[1] * TORCH, direction[2] * TORCH],
    [-direction[0] * 0.4, -direction[1] * 0.4, -direction[2] * 0.4],
  ]);
  const axes = seen([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);
  const shadow = shadowPoints(state);
  const share = shareOf(state);
  return (
    <div className="flex grow flex-col gap-3" data-testid="the-best-shadow" data-share={share}>
      <div className="grid gap-4 sm:grid-cols-2">
        <figure className="flex flex-col gap-1">
          <svg
            viewBox="-1.6 -1.6 3.2 3.2"
            role="img"
            aria-label={words.cloud}
            className="aspect-square w-full rounded-card border border-hairline bg-paper"
          >
            {axes.map(([x, y], index) => (
              <line
                key={index}
                x1={-x}
                y1={y}
                x2={x}
                y2={-y}
                stroke="var(--color-hairline)"
                strokeWidth={0.012}
              />
            ))}
            {cloud.map(([x, y], index) => (
              <circle key={index} cx={x} cy={-y} r={DOT} fill="var(--color-ink)" />
            ))}
            <line
              x1={torchX}
              y1={-torchY}
              x2={tailX}
              y2={-tailY}
              stroke="var(--color-ink)"
              strokeWidth={0.02}
              strokeDasharray="0.08 0.05"
            />
            <circle
              data-torch
              cx={torchX}
              cy={-torchY}
              r={0.1}
              fill="var(--color-paper)"
              stroke="var(--color-ink)"
              strokeWidth={0.03}
            />
          </svg>
          <figcaption className="text-sm text-ink-soft">{words.cloud}</figcaption>
        </figure>
        <figure className="flex flex-col gap-1">
          <svg
            viewBox="-1.2 -1.2 2.4 2.4"
            role="img"
            aria-label={words.shadow}
            className="aspect-square w-full rounded-card border border-hairline bg-sand"
          >
            {shadow.map(([x, y], index) => (
              <circle key={index} cx={x} cy={-y} r={DOT} fill="var(--color-ink-soft)" />
            ))}
          </svg>
          <figcaption className="text-sm text-ink-soft">{words.shadow}</figcaption>
        </figure>
      </div>
      <div className="flex min-h-14 flex-col gap-1 text-sm">
        <p>{words.keeps(outOf(share, { noun: "" }))}</p>
        <div
          className="h-2 overflow-hidden rounded-pill border border-ink-soft bg-paper"
          aria-hidden="true"
        >
          <div className="h-full bg-ink" style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
