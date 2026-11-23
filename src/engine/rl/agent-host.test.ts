import { AgentClient, agentConnection, type AgentPort } from "./agent-client";
import { createAgentHost, createAgentRun } from "./agent-host";
import type { AgentEvent, AgentRunConfig } from "./agent-protocol";
import { LITTLE_BOARD } from "./ppo";
import { inProcessAgent } from "./testing/in-process-agent";

const CATCHER: AgentRunConfig = { kind: "catch", memory: 250, learningRate: 0.02, seed: 1 };
const BOARD: AgentRunConfig = { kind: "board", world: LITTLE_BOARD, clip: 0.2, rounds: 2, seed: 7 };

/** A host whose clock and waits the test turns by hand. */
function handHost() {
  const events: AgentEvent[] = [];
  const waiting: { next: () => void; wait: number }[] = [];
  let clock = 0;
  const handle = createAgentHost(
    (event) => events.push(event),
    (next, wait) => waiting.push({ next, wait }),
    () => clock,
  );
  return {
    events,
    handle,
    waiting,
    /** Runs every waiting slice once, after `ms` pass (each slice's own work takes no time). */
    tick(ms = 0) {
      clock += ms;
      const now = waiting.splice(0);
      for (const { next } of now) next();
    },
  };
}

const moments = (events: AgentEvent[]) =>
  events.flatMap((event) => (event.type === "moment" ? [event] : []));

describe("the agent worker's host", () => {
  it("posts the start, a moment every twenty games, and stops where it was asked to", () => {
    const host = handHost();
    host.handle({ type: "start", run: 1, config: CATCHER });
    host.handle({ type: "go", run: 1, until: 40 });
    while (host.waiting.length > 0) host.tick();
    expect(moments(host.events).map((moment) => moment.step)).toEqual([0, 20, 40]);
    expect(host.events.at(-1)).toEqual({ type: "stopped", run: 1, step: 40 });
  });

  it("keeps to the pace it was asked for, and its moments never depend on it", () => {
    const paced = handHost();
    paced.handle({ type: "start", run: 1, config: BOARD });
    paced.handle({ type: "go", run: 1, until: 3, perSecond: 2 });
    paced.tick();
    // No time has passed: not a single batch yet, and it waits half a second for the next one.
    expect(moments(paced.events)).toHaveLength(1);
    expect(paced.waiting[0]?.wait).toBe(500);
    paced.tick(500);
    expect(moments(paced.events).map((moment) => moment.step)).toEqual([0, 1]);
    paced.tick(1000);
    paced.tick(0);
    expect(moments(paced.events).map((moment) => moment.step)).toEqual([0, 1, 2, 3]);

    const flat = handHost();
    flat.handle({ type: "start", run: 1, config: BOARD });
    flat.handle({ type: "go", run: 1, until: 3 });
    while (flat.waiting.length > 0) flat.tick();
    expect(moments(flat.events).map((moment) => moment.kind === "board" && moment.score)).toEqual(
      moments(paced.events).map((moment) => moment.kind === "board" && moment.score),
    );
  });

  it("ignores commands for an old run and pauses where it is", () => {
    const host = handHost();
    host.handle({ type: "start", run: 1, config: CATCHER });
    host.handle({ type: "start", run: 2, config: CATCHER });
    host.handle({ type: "go", run: 1, until: 40 });
    expect(host.waiting).toHaveLength(0);
    host.handle({ type: "go", run: 2, until: 40, perSecond: 20 });
    host.tick(1000);
    host.handle({ type: "pause", run: 2 });
    expect(host.events.at(-1)).toEqual({ type: "stopped", run: 2, step: 20 });
    host.tick(1000);
    expect(host.events.at(-1)).toEqual({ type: "stopped", run: 2, step: 20 });
  });

  it("says at once when it is already at the step asked for", () => {
    const host = handHost();
    host.handle({ type: "start", run: 1, config: CATCHER });
    host.handle({ type: "go", run: 1, until: 0 });
    expect(host.events.at(-1)).toEqual({ type: "stopped", run: 1, step: 0 });
  });

  it("reports a run it cannot start", () => {
    const host = handHost();
    host.handle({ type: "start", run: 1, config: { ...CATCHER, learningRate: 0 } });
    expect(host.events).toEqual([
      { type: "error", message: "The catcher needs a step size above zero." },
    ]);
    host.handle({ type: "go", run: 1, until: 20 });
    expect(host.waiting).toHaveLength(0);
  });

  it("builds whichever agent it is asked for", () => {
    expect(createAgentRun(CATCHER).moment().kind).toBe("catch");
    expect(createAgentRun(BOARD).moment().kind).toBe("board");
  });
});

describe("the agent client", () => {
  const original = agentConnection.connect;
  afterEach(() => {
    agentConnection.connect = original;
  });

  it("hears its own run's moments through a real host, and drops an old run's", async () => {
    agentConnection.connect = inProcessAgent;
    const steps: number[] = [];
    let stopped = -1;
    const client = new AgentClient({
      onMoment: (moment) => steps.push(moment.step),
      onStopped: (step) => (stopped = step),
      onError: (message) => {
        throw new Error(message);
      },
    });
    client.start(CATCHER);
    client.go(40);
    client.start(CATCHER);
    client.go(20);
    await vi.waitFor(() => expect(stopped).toBe(20), { timeout: 10_000 });
    // The first run's moments arrive after the second began, so none of them count.
    expect(steps).toEqual([0, 20]);
    client.dispose();
    client.dispose();
  }, 15_000);

  it("reports a worker that cannot start or whose messages cannot be read", async () => {
    agentConnection.connect = () => {
      throw new Error("no workers here");
    };
    const errors: string[] = [];
    new AgentClient({ onMoment: () => {}, onError: (message) => errors.push(message) });
    await vi.waitFor(() => expect(errors).toEqual(["no workers here"]));

    const port: AgentPort = { postMessage: () => {}, onmessage: null, terminate: () => {} };
    agentConnection.connect = () => port;
    const client = new AgentClient({
      onMoment: () => {},
      onError: (message) => errors.push(message),
    });
    port.onerror?.();
    port.onmessageerror?.();
    port.onmessage?.({ data: { type: "error", message: "it broke" } } as MessageEvent<AgentEvent>);
    expect(errors.slice(1)).toEqual([
      "The practice worker could not start.",
      "A message from the practice worker could not be read.",
      "it broke",
    ]);
    client.dispose();
  });
});
