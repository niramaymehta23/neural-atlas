/** Messages between the page and World 6's agent worker. `run` tells one run's messages from the next. */
import type { PracticeCommand, PracticeEvent, PracticeRun } from "../practice/protocol";
import type { World } from "./gridworld";
import type { DqnMoment } from "./dqn";
import type { PpoMoment } from "./ppo";

export type AgentRunConfig =
  /** A deep Q-network learning Catch the fruit. */
  | { kind: "catch"; memory: number; learningRate: number; seed: number }
  /** A player and a coach (PPO) learning a board. `clip` may be Infinity: no rail. */
  | { kind: "board"; world: World; clip: number; rounds: number; seed: number };

export type AgentMoment = ({ kind: "catch" } & DqnMoment) | ({ kind: "board" } & PpoMoment);

export type AgentCommand = PracticeCommand<AgentRunConfig>;
export type AgentEvent = PracticeEvent<AgentMoment>;
export type AgentRun = PracticeRun<AgentMoment>;
