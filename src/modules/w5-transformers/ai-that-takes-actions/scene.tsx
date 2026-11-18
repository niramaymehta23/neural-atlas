"use client";

import { useMemo } from "react";
import { useShownFrame } from "@/features/language/use-shown-frame";
import type { ModuleViewProps } from "@/platform/contract";
import { TASKS, words } from "./captions";
import { frameOf, runOf, type AgentFrame, type AgentState } from "./model";

type Props = ModuleViewProps<AgentState, AgentFrame>;

const BUTTON =
  "min-h-11 rounded-pill border border-hairline bg-paper px-4 py-2 text-sm text-accent-ink disabled:opacity-40 md:min-h-0";
const KIND_STYLE: Record<string, string> = {
  think: "border-dashed border-ink-soft bg-paper",
  tool: "border-ink bg-card",
  result: "border-hairline bg-inset",
  failed: "border-2 border-dashed border-ink bg-inset",
  check: "border-dashed border-ink-soft bg-paper",
  answer: "border-2 border-ink bg-card font-semibold",
  stopped: "border-2 border-ink bg-sand font-semibold",
};

/** The job, and the agent's steps as a little play, one card per step. */
export function AgentScene({ state, update, timeline, side }: Props) {
  const frame = useMemo(() => frameOf(state), [state]);
  useShownFrame(timeline, frame);
  const { steps, outcome } = useMemo(() => runOf(state), [state]);
  const editable = side === "main";
  const shown = Math.min(state.shown, steps.length);
  const task = TASKS[state.task] ?? TASKS[0];

  return (
    <div className="flex grow flex-col gap-3" data-testid="ai-that-takes-actions">
      <p className="rounded-card border border-hairline bg-paper p-3">
        <span className="block text-sm text-ink-soft">{words.task}</span>
        {task.ask}
      </p>
      <section className="flex flex-col gap-2" aria-label={words.stage}>
        <ol className="flex min-h-72 flex-col gap-1.5" data-steps={shown}>
          {steps.slice(0, shown).map((step, at) => (
            <li
              key={at}
              data-kind={step.kind}
              className={`rounded-inner border px-3 py-2 text-sm ${KIND_STYLE[step.kind] ?? ""}`}
            >
              <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {words.kinds[step.kind]}
              </span>
              {step.text}
            </li>
          ))}
        </ol>
        <div className="flex min-h-11 flex-wrap items-center gap-2 text-sm">
          {editable && (
            <>
              <button
                type="button"
                className={BUTTON}
                disabled={shown >= steps.length}
                onClick={() => update({ shown: shown + 1 })}
              >
                {words.next}
              </button>
              <button
                type="button"
                className={BUTTON}
                disabled={shown >= steps.length}
                onClick={() => update({ shown: steps.length })}
              >
                {words.all}
              </button>
              <button
                type="button"
                className={BUTTON}
                disabled={shown <= 1}
                onClick={() => update({ shown: 1 })}
              >
                {words.again}
              </button>
            </>
          )}
          <span className="text-ink-soft">{words.step(shown, steps.length)}</span>
        </div>
        <p
          className="min-h-5 text-sm font-semibold"
          data-outcome={shown >= steps.length ? outcome : undefined}
        >
          {shown >= steps.length ? words.outcome[outcome] : ""}
        </p>
      </section>
    </div>
  );
}
