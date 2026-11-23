/** Messages between the page and World 6's agent worker. `run` tells one run's messages from the next. */
import type { World } from "./gridworld";
import type { DqnMoment } from "./dqn";
import type { PpoMoment } from "./ppo";

export type AgentRunConfig =
  /** A deep Q-network learning Catch the fruit. */
  | { kind: "catch"; memory: number; learningRate: number; seed: number }
  /** A player and a coach (PPO) learning a board. `clip` may be Infinity: no rail. */
  | { kind: "board"; world: World; clip: number; rounds: number; seed: number };

export type AgentMoment = ({ kind: "catch" } & DqnMoment) | ({ kind: "board" } & PpoMoment);

export type AgentCommand =
  | { type: "start"; run: number; config: AgentRunConfig }
  /**
   * Keep practising until this many steps (games or batches) have been taken, at most `perSecond`
   * steps a second when given (so a learner can watch), else as fast as it can (a link replaying).
   */
  | { type: "go"; run: number; until: number; perSecond?: number }
  | { type: "pause"; run: number };

export type AgentEvent =
  /** A recorded moment: the start (step 0), then every few steps. */
  | ({ type: "moment"; run: number } & AgentMoment)
  /** Practice stopped: it reached `until`, or was paused. */
  | { type: "stopped"; run: number; step: number }
  | { type: "error"; message: string };
