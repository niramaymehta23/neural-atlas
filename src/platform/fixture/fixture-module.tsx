"use client";

import { useEffect } from "react";
import { Dial } from "@/ui/Dial";
import { defineModule, type Lesson, type ModuleViewProps } from "../contract";
import { captions, missionWords, predictionWords, words } from "./captions";

/**
 * A stand-in lesson for platform tests and the /styleguide/platform page: a ball rolling in a
 * valley, which flies off once the steps are too big. Not part of the curriculum.
 */
export type ValleyState = { step: number; steps: number };

const START = 1;
/** Where the ball is after `steps` steps of size `step` (the valley's slope is 2.5 × place). */
export const placeAfter = (step: number, steps: number) => START * (1 - 2.5 * step) ** steps;
const frameAt = (step: number, epoch: number) => ({ epoch, loss: placeAfter(step, epoch) ** 2 });

function Valley({ state, timeline }: ModuleViewProps<ValleyState>) {
  // Rebuilds the recorded steps from state on mount, so a restored view has the same moments.
  useEffect(() => {
    if (timeline.getState().length > 0) return;
    for (let epoch = 0; epoch <= state.steps; epoch += 1)
      timeline.record(frameAt(state.step, epoch));
  }, [state.step, state.steps, timeline]);
  const place = Math.max(-3, Math.min(3, placeAfter(state.step, state.steps)));
  return (
    <svg viewBox="-4 -1 8 10" className="h-64 w-full" role="img" aria-label={words.scene}>
      <path d="M -3.2 0 Q 0 16 3.2 0" fill="none" className="stroke-ink-soft" strokeWidth="0.08" />
      <circle
        data-testid="ball"
        data-place={place.toFixed(3)}
        cx={place.toFixed(3)}
        cy={(place * place * 0.9).toFixed(3)}
        r="0.3"
        className="fill-accent"
      />
    </svg>
  );
}

function Dials({ state, update, timeline }: ModuleViewProps<ValleyState>) {
  return (
    <>
      <Dial
        label={words.dial}
        value={state.step}
        onChange={(step) => update({ step })}
        describe={(step) =>
          step > 0.8 ? "a huge step" : step > 0.4 ? "a big step" : "a small step"
        }
      />
      <button
        type="button"
        className="self-center rounded-pill border border-hairline px-4 py-2 text-sm"
        onClick={() => {
          const steps = state.steps + 1;
          timeline.record(frameAt(state.step, steps));
          update({ steps });
        }}
      >
        {words.takeStep}
      </button>
    </>
  );
}

export const valleyModule = defineModule<ValleyState>({
  initialState: { step: 0.2, steps: 0 },
  scene: Valley,
  controls: Dials,
  captions,
  missions: [
    {
      id: "fly-off",
      ...missionWords,
      replay: { before: 3, after: 0 },
      when: (state) => state.step > 0.8 && Math.abs(placeAfter(state.step, state.steps)) > 1,
    },
  ],
  predictions: [
    {
      id: "huge-steps",
      question: predictionWords.question,
      choices: [
        { id: "settles", label: predictionWords.settles },
        { id: "flies-off", label: predictionWords.fliesOff },
      ],
      answer: (state) =>
        state.steps < 3
          ? null
          : Math.abs(placeAfter(state.step, state.steps)) > 1
            ? "flies-off"
            : "settles",
    },
  ],
  underTheHood: () => <p>{words.underTheHood}</p>,
  compare: (state) => ({ ...state, step: 0.2 }),
  trains: true,
});

export const valleyLesson: Lesson = {
  id: "fixture-valley",
  world: 1,
  title: "A ball in a valley",
  realTerm: "gradient descent",
  idea: "Learning is walking downhill",
  playWith: "A ball and a dial",
  prerequisites: [],
  load: async () => valleyModule,
};
