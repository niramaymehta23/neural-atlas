import type { Trick } from "./model";

const BODY = { fill: "var(--color-sand)", stroke: "var(--color-ink)", strokeWidth: 1.6 };
const DARK = { fill: "var(--color-ink-soft)", stroke: "var(--color-ink)", strokeWidth: 1.2 };
const LINE = {
  fill: "none",
  stroke: "var(--color-ink-soft)",
  strokeWidth: 1.6,
  strokeLinecap: "round",
} as const;

/** Eyes, nose and ears around a head centred at (x, y). */
function Face({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <>
      <ellipse cx={x - r * 0.85} cy={y + r * 0.1} rx={r * 0.32} ry={r * 0.62} {...DARK} />
      <ellipse cx={x + r * 0.85} cy={y + r * 0.1} rx={r * 0.32} ry={r * 0.62} {...DARK} />
      <circle cx={x} cy={y} r={r} {...BODY} />
      <circle cx={x - r * 0.38} cy={y - r * 0.12} r={r * 0.11} fill="var(--color-ink)" />
      <circle cx={x + r * 0.38} cy={y - r * 0.12} r={r * 0.11} fill="var(--color-ink)" />
      <ellipse cx={x} cy={y + r * 0.35} rx={r * 0.2} ry={r * 0.14} fill="var(--color-ink)" />
    </>
  );
}

/** A curved arrow from `d`, its head at (x, y) pointing along `angle` degrees. */
function Swish({ d, x, y, angle }: { d: string; x: number; y: number; angle: number }) {
  return (
    <>
      <path d={d} {...LINE} />
      <path d="M-3 -3L1 0L-3 3" {...LINE} transform={`translate(${x} ${y}) rotate(${angle})`} />
    </>
  );
}

/**
 * A calm cut-paper puppy doing one of its four tricks, drawn in a 100 × 80 box. Each pose has its
 * own outline (upright, turning with arrows, a raised paw, legs in the air), so it reads without
 * colour.
 */
export function Puppy({ trick }: { trick: Trick }) {
  switch (trick) {
    case "sit":
    case "paw":
      return (
        <g data-pose={trick}>
          <path d="M64 62q10 -2 9 -12" {...LINE} strokeWidth={3} stroke="var(--color-ink)" />
          <ellipse cx={50} cy={54} rx={15} ry={18} {...BODY} />
          <ellipse cx={50} cy={58} rx={8} ry={10} fill="var(--color-card)" />
          <rect x={41} y={60} width={6} height={12} rx={3} {...BODY} />
          {trick === "sit" ? (
            <rect x={53} y={60} width={6} height={12} rx={3} {...BODY} />
          ) : (
            <rect
              x={53}
              y={40}
              width={6}
              height={14}
              rx={3}
              {...BODY}
              transform="rotate(-50 56 52)"
            />
          )}
          <Face x={50} y={30} r={12} />
        </g>
      );
    case "spin":
      return (
        <g data-pose={trick}>
          <Swish d="M20 30a32 22 0 0 1 56 -8" x={76} y={22} angle={20} />
          <Swish d="M80 66a32 22 0 0 1 -56 6" x={24} y={72} angle={200} />
          <path d="M70 46q10 -6 8 -14" {...LINE} strokeWidth={3} stroke="var(--color-ink)" />
          {[36, 44, 56, 64].map((x) => (
            <rect key={x} x={x - 3} y={50} width={6} height={13} rx={3} {...BODY} />
          ))}
          <ellipse cx={51} cy={48} rx={21} ry={11} {...BODY} />
          <Face x={30} y={38} r={11} />
        </g>
      );
    case "roll":
      return (
        <g data-pose={trick}>
          <Swish d="M28 22a26 16 0 0 1 44 0" x={72} y={22} angle={50} />
          {[
            [37, -20],
            [45, -6],
            [57, 6],
            [65, 20],
          ].map(([x = 0, tilt = 0]) => (
            <rect
              key={x}
              x={x - 2.5}
              y={35}
              width={5}
              height={11}
              rx={2.5}
              {...BODY}
              transform={`rotate(${tilt} ${x} 46)`}
            />
          ))}
          <ellipse cx={51} cy={54} rx={21} ry={12} {...BODY} />
          <ellipse cx={51} cy={50} rx={12} ry={5} fill="var(--color-card)" />
          <path d="M30 58q-8 4 -12 0" {...LINE} strokeWidth={3} stroke="var(--color-ink)" />
          {/* On its back, so its face is upside down. */}
          <g transform="rotate(180 76 57)">
            <Face x={76} y={57} r={11} />
          </g>
        </g>
      );
  }
}
