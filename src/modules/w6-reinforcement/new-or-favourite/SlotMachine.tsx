import { useId, type ReactNode } from "react";
import { MachineMark } from "./MachineMark";
import type { Machine } from "./model";

const INK = { stroke: "var(--color-ink)", strokeWidth: 1.2 };
const SOFT = {
  fill: "none",
  stroke: "var(--color-ink-soft)",
  strokeWidth: 1.2,
  strokeLinecap: "round",
} as const;

/** The front panel's pattern: a second cue besides the shape. */
function Pattern({ machine, id }: { machine: Machine; id: string }) {
  const tile = (children: ReactNode, size = 6) => (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
      {children}
    </pattern>
  );
  switch (machine) {
    case "star":
      return tile(<path d="M0 6L6 0" {...SOFT} />);
    case "moon":
      return tile(<circle cx={3} cy={3} r={1.1} fill="var(--color-ink-soft)" />);
    case "heart":
      return tile(<path d="M0 4L2 1L4 4L6 1" {...SOFT} />);
    case "bell":
      return tile(<rect x={0} y={0} width={3} height={3} fill="var(--color-ink-soft)" />);
    case "leaf":
      return tile(<path d="M0 3Q1.5 0.5 3 3T6 3" {...SOFT} />, 6);
  }
}

type SlotMachineProps = {
  machine: Machine;
  /** What the window shows: the last pull's coin, nothing, or blank before any pull. */
  shows: "won" | "lost" | null;
};

/** A flat cut-paper slot machine, 60 × 80: its shape on top, its pattern below, a window between. */
export function SlotMachine({ machine, shows }: SlotMachineProps) {
  const id = `slot-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <>
      <defs>
        <Pattern machine={machine} id={id} />
      </defs>
      <path d="M52 40L57 34L57 18" {...SOFT} stroke="var(--color-ink)" strokeWidth={2} />
      <circle cx={57} cy={16} r={3.2} fill="var(--color-accent)" {...INK} />
      <rect x={4} y={14} width={50} height={62} rx={7} fill="var(--color-card)" {...INK} />
      <g transform="translate(29 11)">
        <circle r={9} fill="var(--color-card)" {...INK} />
        <MachineMark machine={machine} />
      </g>
      <rect x={11} y={24} width={36} height={18} rx={3} fill="var(--color-paper)" {...INK} />
      {shows === "won" && (
        <g data-window="won">
          <circle cx={29} cy={33} r={6.5} fill="var(--color-sand)" {...INK} />
          <circle cx={29} cy={33} r={3.6} fill="none" {...INK} />
        </g>
      )}
      {shows === "lost" && (
        <path
          data-window="lost"
          d="M23 33H35"
          {...SOFT}
          stroke="var(--color-ink)"
          strokeWidth={2}
        />
      )}
      <rect x={10} y={48} width={38} height={22} rx={3} fill={`url(#${id})`} {...INK} />
    </>
  );
}
