"use client";

import { motion } from "motion/react";
import { count } from "@/design/copy";
import { classMark, classTone, markPath } from "@/design/encodings";
import { useSpring } from "@/design/motion";
import type { PaintWords } from "@/data/PaintCanvas";
import { ClassicGarden, GardenOverlay } from "@/features/classic/ClassicGarden";
import { GardenPicker } from "@/features/classic/GardenPicker";
import type { ModuleViewProps } from "@/platform/contract";
import { words } from "./captions";
import {
  ASK,
  familyVote,
  FIELD,
  GARDENS,
  plantTown,
  townField,
  type NeighboursState,
} from "./model";

type Props = ModuleViewProps<NeighboursState>;

const round = (value: number) => Math.round(value * 1000) / 1000;

/** "three neighbours" or "one neighbour". */
export const askedWords = (neighbours: number) =>
  neighbours === 1 ? words.neighbours.one : words.neighbours.many(count(neighbours));

function paintWords(brush: number): PaintWords {
  const where = (across: number, up: number) => [String(across), String(up)] as const;
  return {
    instructions: words.paint.instructions,
    position: (across, up) => words.paint.position(...where(across, up)),
    planted: (group, across, up) =>
      brush === ASK
        ? words.paint.dropped(...where(across, up))
        : words.paint.planted(words.paint.fans[group] ?? "", ...where(across, up)),
    removed: (moved, across, up) =>
      words.paint.removed(
        moved === 0 ? words.paint.nobody : words.paint.people(count(moved), moved === 1),
        ...where(across, up),
      ),
  };
}

/** The new family's marker: a ring with a dot, in ink, so it reads apart from both teams. */
function Family({ x, y }: { x: number; y: number }) {
  return (
    <g data-family>
      <circle
        cx={x}
        cy={y}
        r={0.055}
        fill="var(--color-paper)"
        stroke="var(--color-ink)"
        strokeWidth={0.018}
      />
      <circle cx={x} cy={y} r={0.018} fill="var(--color-ink)" />
    </g>
  );
}

/** What the vote at the family's spot says, in a sentence. */
function Verdict({ state }: { state: NeighboursState }) {
  const asked = familyVote(state);
  if (state.points.length === 0) return <p>{words.nobodyNear}</p>;
  if (!asked) return <p>{words.waiting}</p>;
  const [foxes = 0, owls = 0] = asked.votes;
  const team = words.team[asked.winner] ?? words.team[0];
  const votes = asked.neighbours.map((near) => state.points[near.index]?.label ?? 0);
  const foxCount = votes.filter((label) => label === 0).length;
  const owlCount = votes.length - foxCount;
  return (
    <p data-verdict={asked.winner}>
      {words.verdict(
        askedWords(asked.neighbours.length),
        words.votes(count(foxCount), foxCount === 1),
        words.votes(count(owlCount), owlCount === 1),
        team,
      )}
      {foxes === owls && <span className="block">{words.tied(team)}</span>}
    </p>
  );
}

/** The town map: the new family, the neighbours it asks (joined by threads), and the vote. */
export function NeighboursScene({ state, update, side }: Props) {
  const transition = useSpring("gentle");
  const main = side === "main";
  const asked = familyVote(state);
  const family = state.family;
  const reach = asked?.neighbours.at(-1)?.distance ?? 0;
  const overlay = family && asked && (
    <GardenOverlay>
      <motion.circle
        key={`${family.x},${family.y},${state.neighbours}`}
        cx={family.x}
        cy={family.y}
        initial={{ r: 0 }}
        animate={{ r: reach + 0.03 }}
        transition={transition}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={0.012}
        strokeDasharray="0.04 0.03"
        data-ripple
      />
      {asked.neighbours.map((near) => {
        const point = state.points[near.index];
        if (!point) return null;
        return (
          <g key={near.index} data-neighbour={point.label}>
            <line
              x1={family.x}
              y1={family.y}
              x2={point.x}
              y2={point.y}
              stroke="var(--color-ink)"
              strokeWidth={
                0.008 + 0.02 * Math.min(1, near.weight / (asked.neighbours[0]?.weight || 1))
              }
            />
            <path
              d={markPath(classMark(point.label), point.x, -point.y, 0.05)}
              transform="scale(1 -1)"
              fill={classTone(point.label)}
              stroke="var(--color-ink)"
              strokeWidth={0.016}
            />
          </g>
        );
      })}
      <Family x={family.x} y={family.y} />
    </GardenOverlay>
  );
  return (
    <div className="flex grow flex-col gap-3" data-testid="ask-the-neighbours">
      {main && (
        <GardenPicker
          label={words.start}
          options={GARDENS}
          value={state.garden}
          names={words.gardens}
          onPick={(garden) => update({ garden, points: plantTown(garden), family: null })}
        />
      )}
      <div className="mx-auto w-full max-w-md">
        <ClassicGarden
          dots={state.points}
          onChange={(change) => update((now) => ({ points: change(now.points) }))}
          brush={state.brush === ASK ? 0 : state.brush}
          field={townField(state.points, state.neighbours, state.closeness)}
          resolution={FIELD}
          words={{ label: words.map, paint: paintWords(state.brush), full: words.full }}
          above={overlay}
          footer={<Verdict state={state} />}
          editable={main}
          onPick={
            state.brush === ASK
              ? (spot) => update({ family: { x: round(spot.x), y: round(spot.y) } })
              : undefined
          }
        />
      </div>
    </div>
  );
}
