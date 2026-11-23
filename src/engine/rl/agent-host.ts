/**
 * The worker side of World 6's agents, kept free of `self` so tests can drive it in-process: it
 * practises in short slices, giving way between them so a pause or a new run is heard, keeps to
 * the pace it was asked for, and posts a moment every few steps. Moments fall on fixed steps, so
 * a run's moments never depend on how its work was sliced or paced.
 */
import type { AgentCommand, AgentEvent, AgentMoment, AgentRunConfig } from "./agent-protocol";
import { createDqnRun } from "./dqn";
import { createPpoRun } from "./ppo";

/** Work done before giving way. */
const SLICE_MS = 12;
/** Games between moments for the catcher (a game is a few moves); every batch for the board. */
export const MOMENT_EVERY = { catch: 20, board: 1 } as const;

export type AgentRun = {
  readonly step: number;
  advance(): void;
  moment(): AgentMoment;
  every: number;
};

/** A run of whichever agent `config` asks for. */
export function createAgentRun(config: AgentRunConfig): AgentRun {
  if (config.kind === "catch") {
    const run = createDqnRun(config);
    return {
      get step() {
        return run.step;
      },
      advance: () => run.advance(),
      moment: () => ({ kind: "catch", ...run.moment() }),
      every: MOMENT_EVERY.catch,
    };
  }
  const run = createPpoRun(config);
  return {
    get step() {
      return run.step;
    },
    advance: () => run.advance(),
    moment: () => ({ kind: "board", ...run.moment() }),
    every: MOMENT_EVERY.board,
  };
}

export function createAgentHost(
  post: (event: AgentEvent) => void,
  later: (next: () => void, wait: number) => void = (next, wait) => setTimeout(next, wait),
  now: () => number = () => performance.now(),
) {
  let run = -1;
  let agent: AgentRun | null = null;
  let until = 0;
  let stepping = false;
  /** Steps a second (0: as fast as it can), counted from `paceFrom`. */
  let pace = 0;
  let paceFrom = { time: 0, step: 0 };

  const fail = (error: unknown) => {
    stepping = false;
    agent = null;
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  };

  const slice = () => {
    const current = agent;
    if (!current || !stepping) return;
    let allowed = until;
    try {
      const started = now();
      if (pace > 0)
        allowed = Math.min(
          until,
          paceFrom.step + Math.floor(((started - paceFrom.time) * pace) / 1000),
        );
      while (current.step < allowed && now() - started < SLICE_MS) {
        current.advance();
        if (current.step % current.every === 0) post({ type: "moment", run, ...current.moment() });
      }
    } catch (error) {
      return fail(error);
    }
    if (current.step >= until) {
      stepping = false;
      post({ type: "stopped", run, step: current.step });
      return;
    }
    // Ahead of the pace: wait for the next step's turn; behind it: carry straight on.
    later(slice, current.step >= allowed ? Math.ceil(1000 / pace) : 0);
  };

  return (command: AgentCommand) => {
    if (command.type === "start") {
      run = command.run;
      stepping = false;
      try {
        agent = createAgentRun(command.config);
        post({ type: "moment", run, ...agent.moment() });
      } catch (error) {
        fail(error);
      }
      return;
    }
    if (command.run !== run || !agent) return;
    if (command.type === "pause") {
      if (stepping) {
        stepping = false;
        post({ type: "stopped", run, step: agent.step });
      }
      return;
    }
    until = command.until;
    pace = command.perSecond && command.perSecond > 0 ? command.perSecond : 0;
    paceFrom = { time: now(), step: agent.step };
    if (agent.step >= until) {
      // Already there: say so, so the page knows it has nothing to wait for.
      stepping = false;
      post({ type: "stopped", run, step: agent.step });
      return;
    }
    if (!stepping) {
      stepping = true;
      later(slice, 0);
    }
  };
}
