"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/design/motion";
import { CATCH_COLUMNS, CATCH_ROWS, type Drop } from "@/engine/rl/catch-game";
import { useAgentPractice } from "@/features/rl/use-agent-practice";
import type { ModuleViewProps } from "@/platform/contract";
import { Chart } from "@/visuals/Chart";
import { words } from "./captions";
import {
  configOf,
  frameOf,
  GAMES_PER_SECOND,
  MOST_GAMES,
  RANDOM_CATCHES,
  runOf,
  TEST_DROPS,
  type CatchFrame,
  type CatchState,
} from "./model";

type Props = ModuleViewProps<CatchState, CatchFrame>;

const CELL = 40;
/** How long each move of the shown test drop stays on screen. */
const MOVE_MS = 150;
const LINE_RANGE = { min: 0, max: TEST_DROPS };

/** The fruit: a round paper apple with a leaf. */
function Fruit({ x, y, faint = false }: { x: number; y: number; faint?: boolean }) {
  return (
    <g opacity={faint ? 0.25 : 1} data-piece={faint ? undefined : "fruit"}>
      <circle
        cx={x}
        cy={y + 2}
        r={11}
        fill="var(--color-sand)"
        stroke="var(--color-ink)"
        strokeWidth={2}
      />
      <path
        d={`M${x} ${y - 9} q 6 -6 10 -2 q -5 5 -10 2 Z`}
        fill="var(--color-good)"
        stroke="var(--color-ink)"
        strokeWidth={1}
      />
    </g>
  );
}

/** The basket: a woven paper tray. */
function Basket({ x, y, faint = false }: { x: number; y: number; faint?: boolean }) {
  return (
    <g opacity={faint ? 0.2 : 1} data-piece={faint ? undefined : "basket"}>
      <path
        d={`M${x - 17} ${y - 6} L${x + 17} ${y - 6} L${x + 12} ${y + 12} L${x - 12} ${y + 12} Z`}
        fill="var(--color-card)"
        stroke="var(--color-ink)"
        strokeWidth={2}
      />
      <path
        d={`M${x - 14} ${y} H${x + 14} M${x - 12} ${y + 6} H${x + 12}`}
        stroke="var(--color-ink-soft)"
        strokeWidth={1.5}
      />
    </g>
  );
}

const middle = (index: number) => index * CELL + CELL / 2;

/**
 * The arcade screen playing one test drop the network's own way: the fruit falls a row per move
 * and the basket follows its choices, with faint marks where both have been. Reduced motion shows
 * the end of the drop at once.
 */
function Screen({ sample, caught }: { sample: readonly Drop[]; caught: boolean }) {
  const still = useReducedMotion();
  const [shown, setShown] = useState({ sample, at: 0 });
  if (shown.sample !== sample) setShown({ sample, at: 0 });
  const last = Math.max(0, sample.length - 1);
  const at = still ? last : Math.min(shown.at, last);
  useEffect(() => {
    if (still || at >= last) return;
    const timer = setTimeout(() => setShown((now) => ({ ...now, at: now.at + 1 })), MOVE_MS);
    return () => clearTimeout(timer);
  }, [still, at, last]);
  const now = sample[at];
  const ended = at >= last && sample.length > 1;
  return (
    <figure className="mx-auto flex w-full max-w-56 flex-col items-center gap-1">
      <svg
        role="img"
        aria-label={ended ? words.screenCaught(caught) : words.screen}
        viewBox={`0 0 ${CATCH_COLUMNS * CELL} ${CATCH_ROWS * CELL}`}
        className="w-full rounded-card border border-hairline bg-inset"
        data-screen
        data-at={at}
      >
        {Array.from({ length: CATCH_COLUMNS * CATCH_ROWS }, (_, cell) => (
          <rect
            key={cell}
            x={(cell % CATCH_COLUMNS) * CELL + 2}
            y={Math.floor(cell / CATCH_COLUMNS) * CELL + 2}
            width={CELL - 4}
            height={CELL - 4}
            rx={6}
            fill="var(--color-paper)"
            opacity={0.55}
          />
        ))}
        {sample.slice(0, at).map((drop, step) => (
          <g key={step}>
            <Fruit x={middle(drop.fruitColumn)} y={middle(drop.fruitRow)} faint />
            <Basket x={middle(drop.basket)} y={middle(CATCH_ROWS - 1)} faint />
          </g>
        ))}
        {now && (
          <>
            <Basket x={middle(now.basket)} y={middle(CATCH_ROWS - 1)} />
            <Fruit
              x={middle(now.fruitColumn)}
              y={middle(now.fruitRow) - (now.fruitRow === CATCH_ROWS - 1 ? 10 : 0)}
            />
          </>
        )}
      </svg>
      <figcaption
        className="min-h-5 text-sm"
        data-outcome={ended ? (caught ? "caught" : "missed") : ""}
      >
        {ended ? (caught ? words.caughtMark : words.missedMark) : ""}
      </figcaption>
    </figure>
  );
}

/** The 25 test drops as marks: a filled fruit with a tick when caught, a dashed ring when missed. */
function TestMarks({ caught }: { caught: readonly boolean[] }) {
  const catches = caught.filter(Boolean).length;
  return (
    <svg
      role="img"
      aria-label={words.testsLabel(catches)}
      viewBox={`0 0 ${TEST_DROPS * 12} 14`}
      className="h-4 w-full max-w-80"
      data-tests={catches}
    >
      {Array.from({ length: TEST_DROPS }, (_, at) =>
        caught[at] ? (
          <g key={at} data-test="caught">
            <circle cx={at * 12 + 6} cy={7} r={5} fill="var(--color-ink)" />
            <path
              d={`M${at * 12 + 3.5} 7 l2 2 l3 -4`}
              stroke="var(--color-paper)"
              strokeWidth={1.4}
              fill="none"
            />
          </g>
        ) : (
          <circle
            key={at}
            data-test="missed"
            cx={at * 12 + 6}
            cy={7}
            r={4.5}
            fill="none"
            stroke="var(--color-ink-soft)"
            strokeDasharray="2 1.5"
          />
        ),
      )}
    </svg>
  );
}

/** The arcade screen, its test results and the catch line, from the run on the timeline. */
export function CatchScene(props: Props) {
  const { state, timeline } = props;
  const run = runOf(state);
  const failure = useAgentPractice({
    ...props,
    config: configOf(state),
    runKey: run,
    most: MOST_GAMES,
    perSecond: GAMES_PER_SECOND,
    toFrame: frameOf,
  });
  const { live, cursor } = useSyncExternalStore(
    timeline.subscribe,
    timeline.getState,
    timeline.getState,
  );
  // A worker failure goes to the lesson's error boundary.
  if (failure) throw failure;
  const current = timeline.current();
  const frame = current?.run === run ? current : undefined;
  const frames = timeline.frames().filter((recorded) => recorded.run === run);
  const ghost = timeline.ghostFrames();
  const games = frame?.step ?? 0;

  return (
    <div
      className="flex grow flex-col gap-3"
      data-testid="a-brain-for-the-game"
      data-step={games}
      data-catches={frame?.catches ?? ""}
    >
      <Screen sample={frame?.sample ?? []} caught={frame?.sampleCaught ?? false} />
      <section className="flex min-h-20 flex-col gap-1 text-sm">
        <p className="text-ink-soft">{words.tests}</p>
        <TestMarks caught={frame?.caught ?? []} />
        <p>{frame ? words.catches(frame.catches) : ""}</p>
      </section>
      <div className="flex flex-col gap-1">
        <Chart
          series={[
            ...(ghost.length > 0 ? [{ values: ghost.map((at) => at.catches), ghost: true }] : []),
            { values: frames.map((at) => at.catches) },
          ]}
          label={words.line}
          marker={live ? undefined : cursor}
          range={LINE_RANGE}
          baseline={RANDOM_CATCHES}
          className="h-20 w-full"
        />
        <p className="text-sm text-ink-soft">{words.lineNote}</p>
        <p className="min-h-5 text-sm">{words.games(games, games >= MOST_GAMES)}</p>
      </div>
    </div>
  );
}
