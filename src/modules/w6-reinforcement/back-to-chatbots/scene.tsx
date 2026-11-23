"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useRecordedRun } from "@/features/building/use-recorded-run";
import { TRAITS } from "@/features/language/ranker";
import type { ModuleViewProps } from "@/platform/contract";
import { Chart } from "@/visuals/Chart";
import { CHECKS, words } from "./captions";
import {
  chatRun,
  judgeOf,
  keyOf,
  oldSelf,
  ONLY_FLATTERS,
  type ChatFrame,
  type ChatState,
} from "./model";

type Props = ModuleViewProps<ChatState, ChatFrame>;

/** Weights are drawn up to this size either way. */
const MOST_WEIGHT = 4;
/** Drift is drawn against this much (about as far as it ever goes here). */
const MOST_DRIFT = 2;
/** Its old self, worked out once: it never changes. */
const OLD_SELF = oldSelf();

/** What a run's verdict says about how often it praises. */
export function verdictOf(praise: number) {
  if (praise >= ONLY_FLATTERS) return words.verdict.flatters;
  if (praise >= 0.35) return words.verdict.some;
  return words.verdict.plain;
}

/** The judge the crowd taught, the chatbot's answers to new questions, and how training went. */
export function ChatScene(props: Props) {
  const { state, update, timeline } = props;
  const { failure } = useRecordedRun({
    ...props,
    runs: state.runs,
    work: chatRun,
    settings: keyOf(state),
    rerun: () => update(({ runs }) => ({ runs: runs + 1 }), { touch: false }),
  });
  const { cursor } = useSyncExternalStore(timeline.subscribe, timeline.getState, timeline.getState);
  const shown = state.runs > 0 ? timeline.at(cursor) : undefined;
  const ours = shown && shown.key === keyOf(state) ? shown : undefined;
  const judge = useMemo(() => judgeOf(state.taste), [state.taste]);
  // The whole run so far, for the chart (at most MOST_STEPS / EVERY + 1 points).
  const frames = ours ? timeline.frames().filter((frame) => frame.key === ours.key) : [];
  const best = useMemo(
    () =>
      CHECKS.reduce(
        (sum, question) =>
          sum +
          Math.max(
            ...question.answers.map((answer) =>
              TRAITS.reduce((total, trait) => total + (answer[trait] ? judge[trait] : 0), 0),
            ),
          ),
        0,
      ) / CHECKS.length,
    [judge],
  );
  if (failure) throw failure;
  const chances = ours?.chances ?? OLD_SELF;

  return (
    <div
      className="flex grow flex-col gap-4"
      data-testid="back-to-chatbots"
      data-step={ours?.step ?? 0}
      data-praise={ours ? ours.praise.toFixed(3) : undefined}
    >
      <section className="flex flex-col gap-1 text-sm">
        <p className="font-semibold">{words.judge}</p>
        <ul className="flex flex-col gap-1" data-judge>
          {TRAITS.map((trait) => {
            const value = judge[trait];
            const share = Math.min(1, Math.abs(value) / MOST_WEIGHT) * 50;
            return (
              <li
                key={trait}
                data-trait={trait}
                data-weight={value.toFixed(2)}
                className="grid min-h-7 grid-cols-[minmax(0,8rem)_minmax(3rem,1fr)_minmax(0,7rem)] items-center gap-2"
              >
                <span>{words.likes[trait]}</span>
                <span aria-hidden className="relative h-4 rounded-pill bg-inset">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-ink-soft" />
                  <span
                    className={`absolute inset-y-0 rounded-pill ${value >= 0 ? "bg-flow" : "border border-ink bg-paper"}`}
                    style={
                      value >= 0
                        ? { left: "50%", width: `${share}%` }
                        : { right: "50%", width: `${share}%` }
                    }
                  />
                </span>
                <span className="text-xs text-ink-soft">{words.weight(value)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <p className="font-semibold">{words.answers}</p>
        <p className="text-ink-soft">{ours ? words.trained : words.oldSelf}</p>
        <ul className="flex flex-col gap-2">
          {CHECKS.map((question, at) => (
            <li
              key={question.ask}
              className="flex flex-col gap-1.5 rounded-card border border-hairline bg-paper p-3"
            >
              <p className="text-ink-soft">{words.question(question.ask)}</p>
              <ul className="flex flex-col gap-1.5">
                {question.answers.map((answer, index) => {
                  const chance = chances[at]?.[index] ?? 0;
                  return (
                    <li
                      key={answer.text}
                      className="flex flex-col gap-0.5"
                      data-answer={index}
                      data-chance={chance.toFixed(3)}
                    >
                      <p>
                        <span className="sr-only">
                          {words.chance(answer.text, words.how(chance))}
                        </span>
                        <span aria-hidden>{answer.text} </span>
                        {answer.flatters && (
                          <span className="whitespace-nowrap rounded-pill border-2 border-ink bg-paper px-2 text-xs font-semibold">
                            {words.tags.praises}
                          </span>
                        )}{" "}
                        <span
                          className={`whitespace-nowrap rounded-pill border px-2 text-xs ${answer.correct ? "border-ink" : "border-dashed border-ink"}`}
                        >
                          {answer.correct ? words.tags.right : words.tags.wrong}
                        </span>
                      </p>
                      <span aria-hidden className="h-1.5 w-full rounded-pill bg-hairline">
                        <span
                          className="block h-full rounded-pill bg-ink-soft transition-[width] duration-300 motion-reduce:transition-none"
                          style={{ width: `${Math.round(chance * 100)}%` }}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        {/* A reserved line, so the page does not jump when the verdict changes. */}
        <p className="min-h-10 font-semibold" data-verdict={ours ? "" : undefined}>
          {ours ? verdictOf(ours.praise) : ""}
        </p>
      </section>

      <figure className="flex flex-col gap-1">
        <Chart
          series={[
            { values: frames.map((frame) => frame.score / (best || 1)) },
            {
              values: frames.map((frame) => Math.min(1, frame.drift / MOST_DRIFT)),
              ghost: true,
            },
          ]}
          label={words.chart}
          marker={ours ? frames.indexOf(ours) : undefined}
          range={{ min: 0, max: 1 }}
          className="h-20 w-full"
        />
        <figcaption aria-hidden className="text-xs text-ink-soft">
          {words.chart}
        </figcaption>
      </figure>
      <Link href="/learn/learning-from-thumbs-up" className="text-sm text-accent-ink underline">
        {words.thumbs}
      </Link>
    </div>
  );
}
