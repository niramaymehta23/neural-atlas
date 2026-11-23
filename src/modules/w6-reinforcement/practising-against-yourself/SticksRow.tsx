import { PILE, type Game } from "@/engine/rl/sticks";
import { Cap } from "./Cap";
import { words } from "./captions";

const STICK = 7;
const GAP = 4;

/** The twenty-one sticks of a game, in the order they were taken, topped with who took them. */
export function SticksRow({ game }: { game: Game | null }) {
  const sticks: { x: number; taker: 0 | 1 | null; last: boolean }[] = [];
  let x = 4;
  if (!game)
    for (let at = 0; at < PILE; at += 1)
      sticks.push({ x: x + at * STICK, taker: null, last: false });
  else
    game.moves.forEach((move, turn) => {
      const taker = (turn % 2 === 0 ? game.first : 1 - game.first) as 0 | 1;
      for (let at = 0; at < move.take; at += 1) {
        sticks.push({ x, taker, last: turn === game.moves.length - 1 && at === move.take - 1 });
        x += STICK;
      }
      x += GAP;
    });
  const width = Math.max(4 + PILE * STICK, (sticks.at(-1)?.x ?? 0) + 8);
  const lastTaker = game?.winner === 0 ? words.names.pip : words.names.pop;
  return (
    <svg
      role="img"
      aria-label={game ? words.table.picture(lastTaker) : words.table.waiting}
      viewBox={`0 0 ${width} 44`}
      className="h-auto w-full"
      data-sticks={sticks.length}
    >
      {sticks.map((stick, index) => (
        <g key={index}>
          <rect
            x={stick.x - 1.2}
            y={12}
            width={2.4}
            height={26}
            rx={1.2}
            fill="var(--color-ink-soft)"
          />
          {stick.taker !== null && <Cap player={stick.taker} x={stick.x} y={10} />}
          {stick.last && (
            <path
              d={`M${stick.x - 3} 3L${stick.x + 3} 3L${stick.x} 7Z`}
              fill="var(--color-ink)"
              data-last-stick
            />
          )}
        </g>
      ))}
    </svg>
  );
}
