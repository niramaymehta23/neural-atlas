"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { count, sentenceStart } from "@/design/copy";
import type { ModuleViewProps } from "@/platform/contract";
import { Robot } from "@/ui/illustrations/Robot";
import { words } from "./captions";
import { FruitShape } from "./FruitShape";
import {
  isCurrent,
  newFruit,
  NEW_FRUIT,
  robotFrame,
  robotScore,
  robotSorts,
  teachingFruit,
  type Kind,
  type TeachFrame,
  type TeachState,
} from "./model";

type Props = ModuleViewProps<TeachState, TeachFrame>;
const KINDS = [0, 1] as const;

/**
 * Records each try of the robot as a moment, so a guess placed after watching one try waits
 * for the next. A link with tries rebuilds the newest one from state.
 */
function useRobotTries({ state, timeline }: Props) {
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });
  const { runs } = state;
  useEffect(() => {
    if (runs === 0) return;
    timeline.newRun();
    timeline.record(robotFrame(latest.current));
  }, [runs, timeline]);
}

/** The fruit to sort, your two baskets, and the robot sorting new fruit its own way. */
export function TeachScene(props: Props) {
  const { state, update, side, timeline } = props;
  useRobotTries(props);
  const { length } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const main = side === "main";
  const shown = teachingFruit(state);
  const next = shown[state.baskets.length];
  // The robot's result shows once it has tried on exactly these baskets and dials.
  const tried = isCurrent(state, timeline.at(length - 1));
  const fresh = newFruit(state);
  const choices = tried ? robotSorts(state) : [];

  return (
    <div className="flex grow flex-col gap-4" data-testid="teach-by-showing">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex flex-col items-center gap-3 rounded-card border border-hairline bg-paper p-4">
          {/* A fixed height, so finishing the sorting does not move the page. */}
          <div className="flex h-28 items-center justify-center">
            {next ? (
              <FruitShape fruit={next} size={96} label={words.fruitPicture[next.kind]} />
            ) : (
              <p className="max-w-56 text-center text-sm">{words.doneSorting}</p>
            )}
          </div>
          {main && (
            <div
              className="flex flex-col items-center gap-2"
              role="group"
              aria-label={words.baskets.label}
            >
              <p className="text-sm text-ink-soft">{next ? words.next : " "}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {KINDS.map((basket) => (
                  <button
                    key={basket}
                    type="button"
                    disabled={!next}
                    onClick={() => update(({ baskets }) => ({ baskets: [...baskets, basket] }))}
                    className="flex min-h-11 items-center gap-2 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:cursor-not-allowed disabled:text-ink-soft"
                    data-basket={basket}
                  >
                    <FruitShape fruit={{ kind: basket, round: 0.5, red: 0.5 }} size={20} />
                    {words.baskets[basket]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="flex flex-col gap-2 rounded-card border border-hairline bg-paper p-4">
          <h3 className="text-sm font-medium">{words.sortedSoFar}</h3>
          {KINDS.map((basket) => {
            const inside = shown.flatMap((fruit, index) =>
              state.baskets[index] === basket ? [fruit] : [],
            );
            return (
              <div
                key={basket}
                className="flex min-h-12 flex-wrap items-center gap-1"
                data-shown-basket={basket}
              >
                <span className="w-28 text-xs text-ink-soft">{words.baskets[basket]}</span>
                {inside.length === 0 ? (
                  <span className="text-xs text-ink-soft">{words.emptyBasket}</span>
                ) : (
                  inside.map((fruit, index) => (
                    <FruitShape
                      key={index}
                      fruit={fruit}
                      size={28}
                      dashed={fruit.kind !== basket}
                      label={words.shownNote[fruit.kind][fruit.kind !== basket ? "wrong" : "right"]}
                    />
                  ))
                )}
              </div>
            );
          })}
        </section>
      </div>
      <section className="flex flex-col gap-3 rounded-card border border-hairline bg-paper p-4 sm:flex-row sm:items-center">
        <Robot className="size-20 shrink-0" title={words.robot} />
        <div className="flex min-h-28 grow flex-col gap-2">
          {tried ? (
            <>
              <p data-robot-score>
                {sentenceStart(words.robotScore(count(robotScore(state)), count(NEW_FRUIT)))}
              </p>
              {KINDS.map((basket) => (
                <div
                  key={basket}
                  className="flex flex-wrap items-center gap-1"
                  data-robot-basket={basket}
                >
                  <span className="w-40 text-xs text-ink-soft">{words.robotPile[basket]}</span>
                  {fresh.flatMap((fruit, index) =>
                    choices[index] === basket
                      ? [
                          <FruitShape
                            key={index}
                            fruit={fruit}
                            size={28}
                            mark={fruit.kind === basket ? "right" : "wrong"}
                            label={words.newFruitNote(
                              words.fruit[fruit.kind as Kind],
                              fruit.kind === basket ? words.right : words.wrong,
                            )}
                          />,
                        ]
                      : [],
                  )}
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-ink-soft">{words.robotWaiting}</p>
          )}
        </div>
      </section>
    </div>
  );
}
