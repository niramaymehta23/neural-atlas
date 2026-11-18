/**
 * A scripted agent at work: it follows its plan, using tools and checking results. A broken tool
 * answers with an error; the agent tries again until its patience runs out, or, if it never gives
 * up, until the safety limit stops it.
 */
import type { TimelineFrame } from "@/platform/contract";
import { TASKS, TOOLS, words, type Tool } from "./captions";

export type AgentState = {
  task: number;
  /** The broken tool, or "none". */
  broken: string;
  /** Tries before giving up; NEVER never gives up. */
  patience: number;
  /** The safety limit: the most steps it may take. */
  limit: number;
  /** Steps shown so far. */
  shown: number;
};

export type StepKind = "think" | "tool" | "result" | "failed" | "check" | "answer" | "stopped";
export type Step = { kind: StepKind; text: string };
/** "cutOff": the safety limit stopped it while it still had tries left. */
export type Outcome = "done" | "gaveUp" | "loop" | "cutOff";

export type AgentFrame = TimelineFrame &
  AgentState & {
    steps: number;
    outcome: Outcome;
  };

export const NEVER = 11;
/** The safety limit on steps: never below the longest job with every tool working, plus room. */
export const LIMIT = { min: 12, max: 40, start: 24 } as const;
export const BROKEN = ["none", ...Object.keys(TOOLS)] as const;

export function runOf(state: Pick<AgentState, "task" | "broken" | "patience" | "limit">): {
  steps: Step[];
  outcome: Outcome;
} {
  const steps: Step[] = [];
  const task = TASKS[state.task] ?? TASKS[0];
  for (const action of task.plan) {
    if (action.kind !== "tool") {
      steps.push({ kind: action.kind, text: action.text });
      continue;
    }
    const tool = TOOLS[action.tool as Tool];
    let tries = 0;
    for (;;) {
      if (steps.length + 2 >= state.limit) {
        const never = state.patience >= NEVER;
        steps.push({ kind: "stopped", text: never ? words.stopped : words.cutOff });
        return { steps, outcome: never ? "loop" : "cutOff" };
      }
      steps.push({ kind: "tool", text: words.uses(tool, action.input) });
      if (state.broken !== action.tool) {
        steps.push({ kind: "result", text: words.result(action.output) });
        break;
      }
      tries += 1;
      steps.push({ kind: "failed", text: words.error(tool) });
      if (state.patience < NEVER && tries >= state.patience) {
        steps.push({ kind: "answer", text: words.giveUp(tool) });
        return { steps, outcome: "gaveUp" };
      }
    }
  }
  return { steps, outcome: "done" };
}

export function frameOf(state: AgentState): Omit<AgentFrame, "epoch"> {
  const { steps, outcome } = runOf(state);
  return {
    loss: 0,
    ...state,
    shown: Math.min(state.shown, steps.length),
    steps: steps.length,
    outcome,
  };
}

/** The whole run is on screen and it ended in a loop. */
export const trapped = (frame: Pick<AgentFrame, "outcome" | "shown" | "steps">) =>
  frame.outcome === "loop" && frame.shown >= frame.steps;

/** The tools a job uses. */
export const toolsOf = (task: number): Tool[] =>
  (TASKS[task] ?? TASKS[0]).plan.flatMap((action) =>
    action.kind === "tool" ? [action.tool as Tool] : [],
  );
