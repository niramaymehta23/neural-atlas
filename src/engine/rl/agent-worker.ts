/// <reference lib="webworker" />
import { createAgentHost } from "./agent-host";
import type { AgentCommand, AgentEvent } from "./agent-protocol";

const scope = self as unknown as DedicatedWorkerGlobalScope;
const handle = createAgentHost((event: AgentEvent) => scope.postMessage(event));
scope.onmessage = (message: MessageEvent<AgentCommand>) => handle(message.data);
