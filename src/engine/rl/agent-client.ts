/** The page's handle on one World 6 agent run: its own worker, so practice never holds up the page. */
import { PracticeClient, type PracticeClientOptions, type PracticePort } from "../practice/client";
import type { AgentMoment, AgentRunConfig } from "./agent-protocol";

/** The slice of a Worker the client uses, so tests can connect the host in-process. */
export type AgentPort = PracticePort<AgentRunConfig, AgentMoment>;

const startWorker = (): AgentPort =>
  new Worker(new URL("./agent-worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as AgentPort;

/** How a client reaches its worker; tests swap `connect` for an in-process host. */
export const agentConnection = { connect: startWorker };

export class AgentClient extends PracticeClient<AgentRunConfig, AgentMoment> {
  constructor(options: PracticeClientOptions<AgentMoment>) {
    super(agentConnection.connect, options);
  }
}
