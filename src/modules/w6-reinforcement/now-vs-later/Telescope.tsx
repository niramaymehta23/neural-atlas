import { words } from "./captions";
import {
  FAR_MOVES,
  gammaOf,
  NEAR_MOVES,
  worthFromStart,
  type Destination,
  type NowState,
} from "./model";

/** Track x for food `moves` away from the start (the telescope's lens sits at the start). */
const MOVE_PX = 21;
const LENS_X = 52;
const x = (moves: number) => LENS_X + moves * MOVE_PX;
/** A bowl's radius for a worth: area grows with what it counts for. */
const radius = (worth: number) => 7 * Math.sqrt(Math.max(0, worth));
/** Food further than this still counts for at least a tenth of itself; the view reaches there. */
const SEEN = 0.1;
const MOST_SEEN = 12;
const MIDDLE = 52;

/** How many moves ahead food still counts for at least a tenth (the length of the view). */
export function horizon(care: number) {
  const gamma = gammaOf(care);
  if (gamma <= 0) return 0;
  return Math.min(MOST_SEEN, 1 + Math.log(SEEN) / Math.log(gamma));
}

/**
 * The discount telescope, drawn our own way: a telescope at the start looking down the moves
 * ahead. Its view reaches as far as food still counts; each bowl sits at its distance, its real
 * size dashed and how much it counts from the start filled in. Sizes carry it, not colour.
 */
export function Telescope({ state, heads }: { state: NowState; heads: Destination }) {
  const worth = worthFromStart(state);
  const reach = horizon(state.care);
  const tube = 14 + 14 * state.care;
  const bowls = [
    {
      id: "near",
      moves: NEAR_MOVES,
      size: 1,
      counts: worth.near,
      name: words.telescope.near(NEAR_MOVES),
    },
    {
      id: "far",
      moves: FAR_MOVES,
      size: state.prize,
      counts: worth.far,
      name: words.telescope.far(FAR_MOVES),
    },
  ] as const;
  return (
    <svg
      viewBox="0 0 320 112"
      role="img"
      aria-label={words.telescope.label}
      className="h-auto w-full max-w-lg self-center"
      data-telescope
      data-horizon={reach.toFixed(1)}
    >
      {/* The view: a soft cone from the lens out to where food stops counting. */}
      {reach > 0 && (
        <path
          data-view
          d={`M${LENS_X} ${MIDDLE - 5} L${x(reach)} ${MIDDLE - 34} L${x(reach)} ${MIDDLE + 34} L${LENS_X} ${MIDDLE + 5} Z`}
          fill="var(--color-ink)"
          fillOpacity={0.07}
          stroke="var(--color-ink-soft)"
          strokeDasharray="3 3"
        />
      )}
      <g data-tube>
        <rect
          x={LENS_X - tube - 10}
          y={MIDDLE - 4}
          width={10}
          height={8}
          rx={2}
          fill="var(--color-ink)"
        />
        <path
          d={`M${LENS_X - tube} ${MIDDLE - 5} L${LENS_X} ${MIDDLE - 8} L${LENS_X} ${MIDDLE + 8} L${LENS_X - tube} ${MIDDLE + 5} Z`}
          fill="var(--color-ink-soft)"
        />
      </g>
      <line
        x1={LENS_X}
        y1={98}
        x2={x(MOST_SEEN)}
        y2={98}
        stroke="var(--color-hairline)"
        strokeWidth={2}
      />
      {Array.from({ length: MOST_SEEN }, (_, at) => (
        <line
          key={at}
          x1={x(at + 1)}
          y1={94}
          x2={x(at + 1)}
          y2={102}
          stroke="var(--color-ink-soft)"
        />
      ))}
      {bowls.map((bowl) => (
        <g
          key={bowl.id}
          data-bowl={bowl.id}
          data-counts={bowl.counts.toFixed(3)}
          data-heads={heads === bowl.id || undefined}
        >
          <circle
            cx={x(bowl.moves)}
            cy={MIDDLE}
            r={radius(bowl.size)}
            fill="none"
            stroke="var(--color-ink-soft)"
            strokeDasharray="3 3"
          />
          <circle
            cx={x(bowl.moves)}
            cy={MIDDLE}
            r={radius(bowl.counts)}
            fill="var(--color-good)"
            stroke="var(--color-ink)"
            strokeWidth={heads === bowl.id ? 2.5 : 1}
          />
          <text
            x={bowl.id === "near" ? x(bowl.moves) - 10 : 316}
            y={12}
            textAnchor={bowl.id === "near" ? "start" : "end"}
            fontSize={9}
            fill="var(--color-ink)"
          >
            {bowl.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
