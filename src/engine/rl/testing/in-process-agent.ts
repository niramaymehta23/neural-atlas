/**
 * Runs the agent worker's side in the test's own process, so lesson tests need no real worker.
 * Practice runs flat out here (the learner's watching pace is dropped): the moments are the same,
 * since a run never depends on its pace.
 */
import { agentConnection, type AgentPort } from "../agent-client";
import { createAgentHost } from "../agent-host";
import type { AgentEvent } from "../agent-protocol";

export function inProcessAgent(): AgentPort {
  let ended = false;
  const port: AgentPort = {
    onmessage: null,
    postMessage: (command) =>
      handle(command.type === "go" ? { ...command, perSecond: undefined } : command),
    terminate: () => {
      ended = true;
    },
  };
  const handle = createAgentHost((event: AgentEvent) => {
    if (!ended) setTimeout(() => port.onmessage?.({ data: event } as MessageEvent<AgentEvent>), 0);
  });
  return port;
}

/** Points every new practice run at the in-process host until the test file ends. */
export function practiseAgentsInProcess() {
  const original = agentConnection.connect;
  beforeAll(() => {
    agentConnection.connect = inProcessAgent;
  });
  afterAll(() => {
    agentConnection.connect = original;
  });
}
