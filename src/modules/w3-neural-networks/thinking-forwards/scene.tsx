"use client";

import { useEffect, useMemo } from "react";
import { useReducedMotion } from "@/design/motion";
import type { ModuleViewProps } from "@/platform/contract";
import { NetworkView } from "@/visuals/NetworkView";
import { words } from "./captions";
import {
  appleChance,
  isNonsense,
  LAYERS,
  PARAMS,
  REACH,
  SPEC,
  sureness,
  thought,
  VERY_SURE,
  type ForwardFrame,
  type ForwardState,
} from "./model";

type Props = ModuleViewProps<ForwardState, ForwardFrame>;

/** How long each layer takes to light up while a thought travels. */
const LAYER_MS = 700;
const QUITE_SURE = 0.4;

export const describeRound = (input: number) =>
  input < -1.6
    ? words.round.beyondLong
    : input < -0.35
      ? words.round.long
      : input <= 0.35
        ? words.round.middle
        : input <= 1.6
          ? words.round.round
          : words.round.beyondRound;

export const describeRed = (input: number) =>
  input < -1.6
    ? words.red.beyondYellow
    : input < -0.35
      ? words.red.yellow
      : input <= 0.35
        ? words.red.middle
        : input <= 1.6
          ? words.red.red
          : words.red.beyondRed;

const cellWord = (value: number) =>
  value > 0.6
    ? words.says.strongYes
    : value > 0.2
      ? words.says.yes
      : value >= -0.2
        ? words.says.quiet
        : value >= -0.6
          ? words.says.no
          : words.says.strongNo;

/** The answer line, once the thought has gone all the way through. */
export function answerLine(state: ForwardState): string {
  if (state.thoughts === 0) return words.answer.waiting;
  if (state.shown < LAYERS) return words.answer.travelling;
  const apple = appleChance(state);
  const how = sureness(apple);
  return words.answer.says(
    apple >= 0.5 ? words.answer.apple : words.answer.banana,
    how >= VERY_SURE
      ? words.answer.sure.very
      : how >= QUITE_SURE
        ? words.answer.sure.quite
        : words.answer.sure.unsure,
  );
}

/** The network with the thought lighting up its layers one by one, and each cell's word. */
export function ForwardScene({ state, update, side }: Props) {
  const reduced = useReducedMotion();
  const main = side === "main";
  const values = useMemo(() => thought(state), [state]);
  const travelling = state.thoughts > 0 && state.shown < LAYERS;

  // The thought moves on one layer at a time by itself; with reduced motion it is all there at once.
  useEffect(() => {
    if (!main || !travelling) return;
    if (reduced) return update({ shown: LAYERS }, { touch: false });
    const timer = setTimeout(
      () => update(({ shown }) => ({ shown: Math.min(LAYERS, shown + 1) }), { touch: false }),
      LAYER_MS,
    );
    return () => clearTimeout(timer);
  }, [main, travelling, reduced, state.shown, update]);

  // Layers the thought has not reached yet stay calm.
  const reached = state.thoughts > 0 ? state.shown : 0;
  const activations = values.map((layer, index) =>
    index === 0
      ? layer.map((value) => Math.abs(value) / REACH)
      : index <= reached
        ? layer.map((value) =>
            Math.min(1, Math.abs(index === LAYERS ? 2 * appleChance(state) - 1 : value)),
          )
        : layer.map(() => 0),
  );
  const BUTTON =
    "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm disabled:cursor-not-allowed disabled:text-ink-soft md:min-h-0";

  return (
    <div className="flex grow flex-col gap-3" data-testid="thinking-forwards" data-shown={reached}>
      <NetworkView
        sizes={SPEC.sizes}
        params={PARAMS}
        activations={activations}
        label={words.network}
        flowing={travelling && !reduced}
      />
      {main && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              update(({ thoughts }) => ({ thoughts: thoughts + 1, shown: reduced ? LAYERS : 1 }))
            }
            className={`${BUTTON} text-accent-ink`}
          >
            {state.thoughts === 0 ? words.think : words.thinkAgain}
          </button>
          <button
            type="button"
            disabled={state.thoughts === 0 || state.shown <= 1}
            onClick={() => update(({ shown }) => ({ shown: Math.max(1, shown - 1) }))}
            className={BUTTON}
          >
            {words.back}
          </button>
          <button
            type="button"
            disabled={state.thoughts === 0 || state.shown >= LAYERS}
            onClick={() => update(({ shown }) => ({ shown: Math.min(LAYERS, shown + 1) }))}
            className={BUTTON}
          >
            {words.next}
          </button>
        </div>
      )}
      <ol className="grid gap-2 text-sm sm:grid-cols-2" data-layer-words>
        {values.map((layer, index) => (
          <li
            key={index}
            className="flex flex-col"
            data-layer={index}
            data-reached={index <= reached}
          >
            <span className="font-medium">{words.layers[index]}</span>
            {index === 0 ? (
              <>
                <span className="text-ink-soft">
                  {words.fact.round(describeRound(layer[0] ?? 0))}
                </span>
                <span className="text-ink-soft">{words.fact.red(describeRed(layer[1] ?? 0))}</span>
              </>
            ) : index === LAYERS ? (
              <span className="text-ink-soft">
                {index <= reached ? answerLine(state) : words.says.waiting}
              </span>
            ) : (
              <span className="text-ink-soft">
                {layer
                  .map((value) => (index <= reached ? cellWord(value) : words.says.waiting))
                  .join(" · ")}
              </span>
            )}
          </li>
        ))}
      </ol>
      {/* A reserved line, so the page does not jump when the words change. */}
      <p className="min-h-6 text-sm font-medium" data-answer>
        {answerLine(state)}
        {state.shown >= LAYERS && state.thoughts > 0 && isNonsense(state) && (
          <span className="block font-normal text-ink-soft">{words.answer.nonsense}</span>
        )}
      </p>
    </div>
  );
}
