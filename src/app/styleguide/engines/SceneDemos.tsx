"use client";

import { useState } from "react";
import { makeDataset } from "@/data/datasets";
import { IdeaSpace, type IdeaPoint } from "@/scene3d/IdeaSpace";
import { LossLandscape } from "@/scene3d/LossLandscape";
import { Board } from "@/visuals/Board";

/** A long valley with a few bumps: the shape the downhill lesson rolls balls across. */
const valley = (x: number, z: number) =>
  0.6 * x * x + 2 * (z - 0.3 * x) ** 2 + 0.12 * Math.sin(5 * x) * Math.cos(4 * z);

const BALLS = [
  { x: -0.8, z: 0.6 },
  { x: 0.1, z: 0.05 },
  { x: 0.7, z: -0.4 },
];

const CLOUD: IdeaPoint[] = makeDataset("blobs", { count: 150, classes: 3, seed: 2 }).map(
  ({ x, y, label }, i) => ({
    position: [x, y, ((i * 37) % 100) / 100 - 0.5 + label * 0.3 - 0.3],
    group: label,
  }),
);

const GARDEN = [
  ...["floor", "floor", "wall", "goal"],
  ...["floor", "wall", "floor", "floor"],
  ...["floor", "floor", "floor", "trap"],
] as const;

export function LandscapeDemo() {
  return (
    <LossLandscape
      height={valley}
      markers={BALLS}
      label="A valley of mistakes with three balls resting on it"
      className="h-80 w-full max-w-2xl"
    />
  );
}

export function IdeaSpaceDemo() {
  const [focus, setFocus] = useState<number | undefined>(undefined);
  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={() => setFocus((current) => (current === undefined ? 12 : undefined))}
        className="self-start rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink"
      >
        {focus === undefined ? "Glide to one idea" : "Back to the whole map"}
      </button>
      <IdeaSpace
        points={CLOUD}
        focus={focus}
        label="Three families of ideas floating in space"
        className="h-80 w-full max-w-2xl"
      />
    </div>
  );
}

export function BoardDemo() {
  const [step, setStep] = useState(0);
  const path = [
    { row: 2, column: 0 },
    { row: 1, column: 0 },
    { row: 0, column: 0 },
    { row: 0, column: 1 },
  ];
  return (
    <div className="flex flex-col gap-3">
      <Board
        columns={4}
        tiles={GARDEN}
        piece={path[step % path.length]}
        label="A small garden with a treat in the corner"
        className="w-64"
      />
      <button
        type="button"
        onClick={() => setStep((n) => n + 1)}
        className="self-start rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink"
      >
        Take a step
      </button>
    </div>
  );
}
