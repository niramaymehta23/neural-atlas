/** The worker side of World 6's agents: a run of either agent, practised by the shared host. */
import { createPracticeHost } from "../practice/host";
import type { AgentEvent, AgentRun, AgentRunConfig } from "./agent-protocol";
import { createDqnRun } from "./dqn";
import { createPpoRun } from "./ppo";

/** Games between moments for the catcher (a game is a few moves); every batch for the board. */
export const MOMENT_EVERY = { catch: 20, board: 1 } as const;

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

/** The worker's side: see `practice/host.ts`. */
export const createAgentHost = (
  post: (event: AgentEvent) => void,
  later?: (next: () => void, wait: number) => void,
  now?: () => number,
) => createPracticeHost(createAgentRun, post, later, now);
