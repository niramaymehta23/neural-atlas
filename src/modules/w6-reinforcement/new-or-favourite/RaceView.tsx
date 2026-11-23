import { words } from "./captions";
import { MachineMark } from "./MachineMark";
import {
  bestWins,
  CHANCES,
  favouriteOf,
  MACHINES,
  randomWins,
  STUCK,
  type BotRun,
  type RaceFrame,
} from "./model";

const LEFT = 12;
const RIGHT = 288;
const LANES = [22, 52];

/** Each bot's token: a circle for the curious bot, a square for the hopeful one. */
function Token({ bot, x, y }: { bot: 0 | 1; x: number; y: number }) {
  return bot === 0 ? (
    <circle
      cx={x}
      cy={y}
      r={7}
      fill="var(--color-sand)"
      stroke="var(--color-ink)"
      strokeWidth={1.5}
    />
  ) : (
    <rect
      x={x - 6.5}
      y={y - 6.5}
      width={13}
      height={13}
      rx={2}
      fill="var(--color-flow)"
      stroke="var(--color-ink)"
      strokeWidth={1.5}
    />
  );
}

const machineName = (machine: number) => words.machines[MACHINES[machine] ?? "star"];

/** One bot's line under the track: its coins, the machine it plays most, and its spread of pulls. */
function BotLine({ bot, run }: { bot: 0 | 1; run: BotRun }) {
  const total = run.counts.reduce((sum, pulls) => sum + pulls, 0);
  const { machine, share } = favouriteOf(run);
  const name = bot === 0 ? words.bots.curious : words.bots.hopeful;
  const stuck = total > 0 && share >= STUCK;
  return (
    <div className="flex min-w-0 flex-col gap-1" data-bot={bot} data-wins={run.wins}>
      <p className="flex items-center gap-2 font-semibold">
        <svg viewBox="0 0 20 20" className="size-4 shrink-0" aria-hidden>
          <Token bot={bot} x={10} y={10} />
        </svg>
        <span>{words.race.botCoins(name, run.wins)}</span>
      </p>
      <p className="min-h-10 text-ink-soft" data-stuck={bot === 0 && stuck ? "" : undefined}>
        {bot === 0 ? words.bots.curiousNote : words.bots.hopefulNote}{" "}
        {total === 0
          ? ""
          : stuck
            ? words.race.stuck(machineName(machine))
            : words.race.favourite(machineName(machine))}
      </p>
      <div className="flex items-end gap-1.5" aria-label={words.race.spread} role="img">
        {MACHINES.map((mark, index) => (
          <span key={mark} className="flex w-7 flex-col items-center gap-0.5">
            <span className="flex h-8 w-3 items-end rounded-pill bg-inset">
              <span
                className="w-full rounded-pill bg-ink-soft"
                style={{
                  height: `${total === 0 ? 0 : Math.round(((run.counts[index] ?? 0) / total) * 100)}%`,
                }}
              />
            </span>
            <svg viewBox="-8 -8 16 16" className="size-4" aria-hidden>
              <MachineMark machine={mark} />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

/** The bots' race: tokens moving along a track by coins won, against a random player's pace. */
export function RaceView({ frame }: { frame: RaceFrame }) {
  const scale = (wins: number) =>
    LEFT + Math.min(1, wins / Math.max(1, bestWins(frame.budget))) * (RIGHT - LEFT);
  const random = scale(randomWins(frame.epoch));
  const [curious, hopeful] = frame.bots;
  const finished = frame.epoch === frame.budget;
  return (
    <div
      className="flex flex-col gap-3"
      data-race={frame.epoch}
      data-finished={finished || undefined}
    >
      <figure className="flex flex-col gap-1">
        <svg
          viewBox="0 0 300 74"
          role="img"
          aria-label={words.race.track}
          className="h-auto w-full rounded-card border border-hairline bg-card"
        >
          {LANES.map((y) => (
            <line
              key={y}
              x1={LEFT}
              x2={RIGHT}
              y1={y}
              y2={y}
              stroke="var(--color-hairline)"
              strokeWidth={6}
              strokeLinecap="round"
            />
          ))}
          <line
            x1={RIGHT}
            x2={RIGHT}
            y1={8}
            y2={66}
            stroke="var(--color-ink)"
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />
          <line
            x1={random}
            x2={random}
            y1={10}
            y2={64}
            stroke="var(--color-ink-soft)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            data-random
          />
          <Token bot={0} x={scale(curious.wins)} y={LANES[0] ?? 0} />
          <Token bot={1} x={scale(hopeful.wins)} y={LANES[1] ?? 0} />
        </svg>
        <figcaption className="flex flex-wrap gap-x-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 16 10" className="h-2.5 w-4" aria-hidden>
              <line
                x1={8}
                x2={8}
                y1={0}
                y2={10}
                stroke="var(--color-ink-soft)"
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
            </svg>
            {words.race.random}
          </span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 16 10" className="h-2.5 w-4" aria-hidden>
              <line
                x1={8}
                x2={8}
                y1={0}
                y2={10}
                stroke="var(--color-ink)"
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />
            </svg>
            {words.race.finish}
          </span>
        </figcaption>
      </figure>
      <p className="text-sm text-ink-soft">{words.race.pulls(frame.epoch, frame.budget)}</p>
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <BotLine bot={0} run={curious} />
        <BotLine bot={1} run={hopeful} />
      </div>
      {/* Reserved space, so the page does not jump when the secret appears. */}
      <div className="min-h-28 text-sm" data-secret={finished || undefined}>
        {finished && (
          <>
            <p className="font-semibold">{words.secret.title}</p>
            <ul className="flex flex-col gap-0.5">
              {MACHINES.map((mark, index) => (
                <li key={mark} className="flex items-center gap-2">
                  <svg viewBox="-8 -8 16 16" className="size-4" aria-hidden>
                    <MachineMark machine={mark} />
                  </svg>
                  {words.secret.chance(
                    words.machines[mark],
                    Math.round((CHANCES[index] ?? 0) * 10),
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
