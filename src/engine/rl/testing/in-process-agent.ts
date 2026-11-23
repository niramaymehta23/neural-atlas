/** Runs the agent worker's side in the test's own process, so lesson tests need no real worker. */
import { inProcessPractice } from "../../practice/testing/in-process";
import { agentConnection, type AgentPort } from "../agent-client";
import { createAgentRun } from "../agent-host";

export const inProcessAgent = (): AgentPort => inProcessPractice(createAgentRun);

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
