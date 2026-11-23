"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { count } from "@/design/copy";
import { IdeaCardButton } from "@/ui/glossary/idea-cards";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { TermTag } from "@/ui/TermTag";
import { award } from "../achievements/achievements";
import { ComputeMeter } from "../meter/ComputeMeter";
import { BUTTON, MAIN_BUTTON } from "../shell/buttons";
import { pages, shellCaptions } from "../shell/captions";
import { ExperiencePage, type Announce } from "../shell/ExperiencePage";
import type { ExperienceView } from "../shell/use-experience";
import { useLab } from "../shell/use-lab";
import { SoundToggle } from "../sound/SoundToggle";
import { useSoundOf } from "../sound/use-sound-of";
import { twoPlayerCaptions as words } from "./captions";
import { CellPicker, CutPicker, MendStage } from "./MendGame";
import {
  CELLS,
  configOf,
  counted,
  CUTS,
  dotsOf,
  gardensFor,
  MOST_SEEDS,
  mostSteps,
  newRound,
  playerAt,
  roles,
  runKeyOf,
  twoPlayer,
  winnerOf,
  type TwoState,
  type Winner,
} from "./model";
import { RacePick, RaceRun } from "./RaceGame";

/** Steps a second: slow enough to cheer, fast enough to finish a round within half a minute. */
const PACE = { race: 5, mend: 15 };

/** The lesson each game comes from, for its idea card. */
const IDEA = { race: "stacking-cells", mend: "specialising" };

type ViewProps = ExperienceView<TwoState> & { announce: Announce };

function result(
  state: TwoState,
  winner: Winner,
  reached: boolean,
): { title: string; note: string } {
  if (state.game === "mend") {
    const { breaker, repairer } = roles(state);
    return {
      title:
        winner === repairer
          ? words.mend.repaired(words.players[repairer])
          : words.mend.notRepaired(words.players[breaker]),
      note: "",
    };
  }
  if (winner === "tie") {
    const same = state.teams[0] === state.teams[1] && state.paces[0] === state.paces[1];
    return { title: words.race.tie, note: same ? words.race.same : words.race.tiedEnd };
  }
  return {
    title: words.race.won(words.players[winner]),
    note: reached ? "" : words.race.ended,
  };
}

function Game({ state, update, announce }: ViewProps) {
  const { game, garden, seed, stage, teams, paces, cuts, cells } = state;
  const run = useMemo(
    () => ({ game, garden, seed, stage, teams, paces, cuts, cells }),
    [game, garden, seed, stage, teams, paces, cuts, cells],
  );
  const config = useMemo(() => configOf(run), [run]);
  const runKey = useMemo(() => runKeyOf(run), [run]);
  const dots = useMemo(() => dotsOf(run), [run]);
  const lab = useLab({
    config,
    runKey,
    steps: state.steps,
    running: state.running,
    most: mostSteps(state),
    perSecond: PACE[game],
    endsAt: (moment) => moment.kind === "race" && winnerOf(moment, state) !== null,
    onStep: (steps) => {
      if (stage === "play") update({ steps }, { touch: false });
    },
    onFinished: () => {
      if (state.running) update({ running: false }, { touch: false });
    },
  });
  const race = lab.moment?.kind === "race" ? lab.moment : null;
  const mend = lab.lastMoment?.kind === "mend" ? lab.lastMoment : null;
  const moment = lab.moment;
  const winner = winnerOf(moment, state);
  const outcome =
    winner === null ? null : result(state, winner, race === null || race.step < mostSteps(state));

  // A round's win counts once, whether it was just played or its link was opened at the end.
  useEffect(() => {
    if (winner === null || state.counted) return;
    update(counted(state, winner), { touch: false });
    void award(game);
    if (outcome) announce(`${outcome.title} ${outcome.note}`);
  }, [winner, state, update, game, outcome, announce]);

  const lead = race
    ? race.teams.reduce((best, team) => (team.right > best.right ? team : best))
    : mend;
  useSoundOf(
    lead && moment ? { step: moment.step, off: lead.off, right: lead.right } : null,
    state.running,
  );

  // Each stage's heading takes the focus, so the next player starts from the top.
  const heading = useRef<HTMLHeadingElement>(null);
  const before = useRef(stage);
  useEffect(() => {
    if (before.current === stage) return;
    before.current = stage;
    heading.current?.focus();
  }, [stage]);

  const player = playerAt(state);
  const name = words.players[player];
  const pick = (change: Partial<TwoState>) => update(change);
  const playing = state.steps > 0;

  const titles: Record<TwoState["stage"], string> = {
    one: game === "race" ? words.race.heading(name) : words.mend.break.heading(name),
    pass: words.pass(name),
    two: game === "race" ? words.race.heading(name) : words.mend.repair.heading(name),
    play: outcome?.title ?? (game === "race" ? words.race.ready : words.mend.repair.practising),
  };

  const main = (label: string, onClick: () => void, disabled = false) => (
    <button type="button" className={MAIN_BUTTON} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
  const start = game === "race" ? words.race : words.mend.repair;

  let body: ReactNode;
  let action: ReactNode;
  if (stage === "pass") {
    body = <p className="text-ink-soft">{words.passNote(name)}</p>;
    action = main(words.ready, () => update({ stage: "two" }));
  } else if (stage === "one" || stage === "two") {
    const first = stage === "one";
    body =
      game === "race" ? (
        <RacePick state={state} player={player} onPick={pick} />
      ) : (
        <div className="grid items-start gap-6 md:grid-cols-2">
          <MendStage state={state} dots={dots} moment={mend} onPick={pick} />
          {first ? (
            <CutPicker state={state} onPick={pick} />
          ) : (
            <CellPicker state={state} onPick={pick} />
          )}
        </div>
      );
    action = first
      ? main(words.hide, () => update({ stage: "pass" }), game === "mend" && cuts.length < CUTS)
      : game === "race"
        ? main(words.hide, () => update({ stage: "play" }))
        : main(
            words.mend.repair.start,
            () => update({ stage: "play", running: true }),
            cells.length < CELLS,
          );
  } else {
    body =
      game === "race" ? (
        <RaceRun state={state} dots={dots} moment={race} />
      ) : (
        <MendStage state={state} dots={dots} moment={mend} onPick={pick} />
      );
    action =
      winner !== null
        ? main(game === "race" ? words.again : words.swap, () =>
            update(
              newRound({
                seed: (seed % MOST_SEEDS) + 1,
                breaker: game === "mend" ? 1 - state.breaker : state.breaker,
              }),
            ),
          )
        : main(state.running ? start.pause : playing ? start.carryOn : start.start, () =>
            update({ running: !state.running }),
          );
  }

  const offset = game === "race" ? 0 : 2;
  const won = (at: 0 | 1) => count(state.score[at + offset] ?? 0);
  return (
    <>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <SegmentedControl
          label={words.game.label}
          options={[
            { value: "race", label: words.game.race },
            { value: "mend", label: words.game.mend },
          ]}
          value={game}
          onChange={(next) =>
            update(
              newRound({
                game: next,
                garden: gardensFor(next).find((name) => name === garden) ?? "circles",
              }),
            )
          }
        />
        <p
          data-score={state.score.slice(offset, offset + 2).join("-")}
          className="min-h-11 content-center text-sm"
        >
          <span className="text-ink-soft">{words.score.label}: </span>
          {words.score.line(won(0), won(1))}
        </p>
      </div>
      <p className="max-w-prose text-ink-soft">{words.rules[game]}</p>
      <IdeaCardButton about={IDEA[game]} className="self-start" />
      <section
        data-game={game}
        data-stage={stage}
        data-steps={state.steps}
        data-winner={winner ?? undefined}
        aria-label={words.game[game]}
        className="flex min-h-[32rem] flex-col gap-5 rounded-card border border-hairline bg-card p-4 md:p-6"
      >
        <div className="min-h-20">
          <h2 ref={heading} tabIndex={-1} className="text-3xl leading-tight outline-none">
            {titles[stage]}
          </h2>
          <p className="text-ink-soft">
            {outcome
              ? outcome.note
              : stage === "play" && game === "race"
                ? `${playing ? "" : `${words.race.readyNote} `}${words.race.goal}`
                : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {action}
          {(stage !== "one" || lab.failure) && (
            <button
              type="button"
              className={BUTTON}
              onClick={() => {
                update(newRound({}));
                if (lab.failure) lab.retry();
              }}
            >
              {words.restart}
            </button>
          )}
        </div>
        {lab.failure && <p role="alert">{shellCaptions.workerFailed}</p>}
        {body}
      </section>
      {stage === "one" && (
        <SegmentedControl
          label={words.garden.label}
          showLabel
          options={gardensFor(game).map((value) => ({
            value,
            label: words.garden.names[value],
          }))}
          value={garden}
          onChange={(next) => update(newRound({ garden: next }))}
        />
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <ComputeMeter
          times={
            race
              ? race.teams[0].times + race.teams[1].times
              : game === "mend" && mend && stage === "play"
                ? mend.times
                : 0
          }
        />
        <SoundToggle />
      </div>
      <div className="min-h-9">
        {winner !== null && <TermTag lead={words.term.lead} term={words.term[game]} />}
      </div>
    </>
  );
}

/** Two games for two people sharing one screen. */
export function TwoPlayerPage() {
  return (
    <ExperiencePage
      spec={twoPlayer}
      title={pages.twoPlayer.title}
      opening={pages.twoPlayer.opening}
    >
      {(view) => <Game {...view} />}
    </ExperiencePage>
  );
}
