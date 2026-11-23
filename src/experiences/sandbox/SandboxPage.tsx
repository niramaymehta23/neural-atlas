"use client";

import { useMemo } from "react";
import { PaperCard } from "@/ui/PaperCard";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Chart } from "@/visuals/Chart";
import { award } from "../achievements/achievements";
import { ComputeMeter } from "../meter/ComputeMeter";
import { BUTTON, MAIN_BUTTON } from "../shell/buttons";
import { pages, shellCaptions } from "../shell/captions";
import { ExperiencePage } from "../shell/ExperiencePage";
import type { ExperienceView } from "../shell/use-experience";
import { useLab } from "../shell/use-lab";
import { Workbench } from "../shell/Workbench";
import { SoundToggle } from "../sound/SoundToggle";
import { useSoundOf } from "../sound/use-sound-of";
import { BoardDials, BoardStage } from "./BoardLab";
import { sandboxCaptions as words } from "./captions";
import { TEAM_SIZES } from "@/engine/lab/garden-run";
import { GardenDials, GardenStage, TeamView } from "./GardenLab";
import {
  afresh,
  configOf,
  dotsOf,
  MOST_SEEDS,
  mostSteps,
  runKeyOf,
  sandbox,
  stepsPerSecond,
  type SandboxState,
} from "./model";

const FULL = { min: 0, max: 1 };

function SandboxBench({ state, update }: ExperienceView<SandboxState>) {
  const { place, garden, points, model, board, tiles, agent, seed } = state;
  const run = useMemo(
    () => ({ place, garden, points, model, board, tiles, agent, seed }),
    [place, garden, points, model, board, tiles, agent, seed],
  );
  const config = useMemo(() => configOf(run), [run]);
  const runKey = useMemo(() => runKeyOf(run), [run]);
  const dots = useMemo(() => dotsOf(run), [run]);
  const most = mostSteps(state);
  const lab = useLab({
    config,
    runKey,
    steps: state.steps,
    running: state.running,
    most,
    perSecond: stepsPerSecond(state),
    onStep: (steps) => update({ steps }, { touch: false }),
    onFinished: () => {
      if (!state.running) return;
      update({ running: false }, { touch: false });
      void award(place === "garden" ? "sandbox-garden" : "sandbox-board");
    },
  });
  const { moment } = lab;
  const inGarden = place === "garden";
  const gardenMoment = lab.lastMoment?.kind === "garden" ? lab.lastMoment : null;
  const boardMoment = moment?.kind === "board" ? moment : null;
  useSoundOf(moment && moment.kind !== "race" ? moment : null, state.running);

  const right = moment && moment.kind !== "race" ? moment.right : 0;
  const started = state.steps > 0;
  const result = !started
    ? words.result.gardenStart
    : inGarden
      ? (garden === "own" ? words.result.own : words.result.fresh)(right)
      : words.result.board(right);
  const verdict = started && state.steps >= most ? words.verdict[place](right) : "";
  const remembered =
    moment?.kind === "garden" && moment.remembered > 0
      ? words.garden.remembered(moment.remembered)
      : "";
  const note =
    config === null ? words.garden.empty : [result, remembered, verdict].filter(Boolean).join(" ");
  const learner = inGarden ? words.models.names[model] : words.agents.names[agent];
  const where = inGarden ? words.gardens.names[garden] : words.boards.names[board];

  return (
    <>
      <div className="self-start">
        <SegmentedControl
          label={words.place.label}
          options={[
            { value: "garden", label: words.place.garden },
            { value: "board", label: words.place.board },
          ]}
          value={place}
          onChange={(next) => update(afresh({ place: next }))}
        />
      </div>
      <Workbench
        stage={
          <>
            {inGarden ? (
              <GardenStage
                state={state}
                update={update}
                dots={dots}
                moment={config === null ? null : gardenMoment}
                note={note}
              />
            ) : (
              <BoardStage state={state} update={update} moment={boardMoment} note={note} />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={MAIN_BUTTON}
                disabled={config === null}
                onClick={() => {
                  if (!state.running && state.steps >= most) {
                    update({ steps: 0, running: true });
                    lab.restart();
                  } else update({ running: !state.running });
                }}
                data-run={state.running ? "on" : "off"}
              >
                {state.running
                  ? shellCaptions.pause
                  : state.steps >= most
                    ? shellCaptions.replay
                    : shellCaptions.play}
              </button>
              <button
                type="button"
                className={BUTTON}
                disabled={state.steps === 0 && !lab.failure}
                onClick={() => {
                  update(afresh({}));
                  if (lab.failure) lab.retry();
                  else lab.restart();
                }}
              >
                {shellCaptions.again}
              </button>
              <button
                type="button"
                className={BUTTON}
                disabled={inGarden && garden === "own"}
                onClick={() => update(afresh({ seed: (seed % MOST_SEEDS) + 1 }))}
              >
                {inGarden ? words.shuffle : words.shuffleBoard}
              </button>
              {inGarden && garden === "own" && (
                <button
                  type="button"
                  className={BUTTON}
                  disabled={points.length === 0}
                  onClick={() => update(afresh({ points: [] }))}
                >
                  {words.clear}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1" data-steps={state.steps} data-right={right}>
              <p className="text-sm text-ink-soft">{words.progress(state.steps / most)}</p>
              <Chart
                series={[{ values: lab.history.right[0] ?? [] }]}
                label={inGarden ? words.curve.garden : words.curve.board}
                range={FULL}
                className="h-20 w-full"
              />
              <p className="text-sm text-ink-soft">
                {inGarden ? words.curve.garden : words.curve.board}
              </p>
            </div>
            {lab.failure && <p role="alert">{shellCaptions.workerFailed}</p>}
          </>
        }
        dock={
          <>
            <PaperCard className="flex flex-col gap-5">
              {inGarden ? (
                <GardenDials state={state} update={update} />
              ) : (
                <BoardDials state={state} update={update} />
              )}
            </PaperCard>
            {inGarden && TEAM_SIZES[model] && (
              <PaperCard>
                <TeamView state={state} moment={gardenMoment} />
                <p className="text-sm text-ink-soft">{words.garden.network}</p>
              </PaperCard>
            )}
            <PaperCard>
              <ComputeMeter
                times={moment && moment.kind !== "race" ? moment.times : 0}
                perAnswer={moment?.kind === "garden" ? moment.perAnswer : undefined}
                started={started}
              />
            </PaperCard>
            <PaperCard>
              <SoundToggle />
            </PaperCard>
          </>
        }
      />
      <p aria-live="polite" className="sr-only" data-description>
        {state.running ? "" : words.describe(learner, where, note)}
      </p>
    </>
  );
}

export function SandboxPage() {
  return (
    <ExperiencePage spec={sandbox} title={pages.sandbox.title} opening={pages.sandbox.opening}>
      {(view) => <SandboxBench {...view} />}
    </ExperiencePage>
  );
}
