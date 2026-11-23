"use client";

import { useMemo, useState } from "react";
import type { DatasetName } from "@/data/datasets";
import { GARDEN_MODELS, type GardenModel } from "@/engine/lab/garden-run";
import { ClassicGarden } from "@/features/classic/ClassicGarden";
import { paintWords } from "@/features/classic/paint-words";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { sandboxCaptions } from "../sandbox/captions";
import {
  configOf,
  dotsOf,
  mostSteps,
  RESOLUTION,
  runKeyOf,
  sandbox,
  stepsPerSecond,
} from "../sandbox/model";
import { MAIN_BUTTON } from "../shell/buttons";
import { shellCaptions } from "../shell/captions";
import { useLab } from "../shell/use-lab";

const PAINT = paintWords(sandboxCaptions.garden.paint);
const still = () => undefined;
/** A fence, and the two learners that came after it. */
const TRY = GARDEN_MODELS.filter((model) => ["line", "team", "bigTeam"].includes(model));

type PairExhibitProps = { garden: DatasetName; model: GardenModel };

/** A learner in a garden of dots, as in the sandbox: press start, or swap the learner. */
export function PairExhibit({ garden, model: first }: PairExhibitProps) {
  const [model, setModel] = useState(first);
  const [steps, setSteps] = useState(0);
  const [running, setRunning] = useState(false);
  const state = useMemo(
    () => ({ ...sandbox.initialState, place: "garden" as const, garden, model }),
    [garden, model],
  );
  const config = useMemo(() => configOf(state), [state]);
  const dots = useMemo(() => dotsOf(state), [state]);
  const most = mostSteps(state);
  const lab = useLab({
    config,
    runKey: runKeyOf(state),
    steps,
    running,
    most,
    perSecond: stepsPerSecond(state),
    onStep: setSteps,
    onFinished: () => setRunning(false),
  });
  const moment = lab.lastMoment?.kind === "garden" ? lab.lastMoment : null;
  const note =
    steps === 0
      ? sandboxCaptions.result.gardenStart
      : `${sandboxCaptions.result.fresh(moment?.right ?? 0)} ${steps >= most ? sandboxCaptions.verdict.garden(moment?.right ?? 0) : ""}`;
  return (
    <div data-pair={`${garden} ${model}`} className="flex flex-wrap items-start gap-6">
      <div className="w-full max-w-sm">
        <ClassicGarden
          dots={dots}
          onChange={still}
          brush={0}
          editable={false}
          field={moment?.field ?? null}
          resolution={RESOLUTION}
          words={{
            label: sandboxCaptions.gardens.names[garden],
            paint: PAINT,
            full: sandboxCaptions.garden.full,
          }}
          footer={<p>{note}</p>}
        />
      </div>
      <div className="flex flex-col items-start gap-4">
        <SegmentedControl
          label={sandboxCaptions.models.label}
          showLabel
          vertical
          options={TRY.map((value) => ({ value, label: sandboxCaptions.models.names[value] }))}
          value={model}
          onChange={(next) => {
            setModel(next);
            setSteps(0);
            setRunning(false);
          }}
        />
        <button
          type="button"
          className={MAIN_BUTTON}
          onClick={() => {
            if (lab.failure) {
              setSteps(0);
              setRunning(false);
              lab.retry();
            } else if (!running && steps >= most) {
              setSteps(0);
              lab.restart();
              setRunning(true);
            } else setRunning(!running);
          }}
        >
          {lab.failure
            ? shellCaptions.again
            : running
              ? shellCaptions.pause
              : steps >= most
                ? shellCaptions.replay
                : shellCaptions.play}
        </button>
        {lab.failure && (
          <p role="alert" className="max-w-64">
            {shellCaptions.workerFailed}
          </p>
        )}
      </div>
    </div>
  );
}
