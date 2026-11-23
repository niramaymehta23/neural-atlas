import { PILE, winningTake } from "@/engine/rl/sticks";

const CELL = 10;

/** Its favourite take from every pile, twenty-one sticks on the left down to one on the right. */
export function HabitStrip({ takes, label }: { takes: readonly number[]; label: string }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${PILE * CELL} 30`}
      className="h-auto w-full"
      data-habits={takes.join("")}
    >
      {Array.from({ length: PILE }, (_, column) => {
        const sticks = PILE - column;
        const take = takes[sticks - 1] ?? 1;
        const best = winningTake(sticks);
        const left = column * CELL;
        return (
          <g key={sticks}>
            <rect
              x={left + 0.5}
              y={0.5}
              width={CELL - 1}
              height={29}
              rx={2}
              fill="var(--color-card)"
              stroke="var(--color-hairline)"
              strokeWidth={0.6}
            />
            {Array.from({ length: take }, (_, at) => (
              <rect
                key={at}
                x={left + CELL / 2 - 3.5 + at * 3}
                y={4}
                width={1.6}
                height={12}
                rx={0.8}
                fill="var(--color-ink)"
              />
            ))}
            {best === null ? (
              <path
                d={`M${left + 3} 23H${left + CELL - 3}`}
                stroke="var(--color-ink-soft)"
                strokeWidth={1}
              />
            ) : best === take ? (
              <path
                data-perfect
                d={`M${left + 5} 19.5l1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z`}
                fill="var(--color-ink)"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
