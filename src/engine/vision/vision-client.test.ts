import type { VisionCommand, VisionEvent } from "./protocol";
import {
  IDLE_MS,
  LOAD_TIMEOUT_MS,
  READ_TIMEOUT_MS,
  VisionError,
  VisionReader,
  type VisionPort,
} from "./vision-client";

class FakePort implements VisionPort {
  sent: VisionCommand[] = [];
  terminated = false;
  onmessage: ((message: MessageEvent<VisionEvent>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  postMessage(command: VisionCommand) {
    this.sent.push(command);
  }
  terminate() {
    this.terminated = true;
  }
  answer(event: VisionEvent) {
    this.onmessage?.({ data: event } as MessageEvent<VisionEvent>);
  }
}

const picture = () => new Uint8ClampedArray(224 * 224 * 4);
const seen = { answers: [{ thing: 1, name: "goldfish", share: 0.9 }] };

function setup() {
  const ports: FakePort[] = [];
  const reader = new VisionReader(() => {
    const port = new FakePort();
    ports.push(port);
    return port;
  });
  return { reader, ports };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("the picture reader", () => {
  it("starts one worker, reports loading then ready, and answers pictures", async () => {
    const { reader, ports } = setup();
    const first = reader.see(picture(), { maps: true });
    const second = reader.see(picture());
    expect(ports).toHaveLength(1);
    expect(reader.getStatus()).toBe("loading");
    const port = ports[0]!;
    port.answer({ type: "ready", device: "tfjs-webgl" });
    expect(reader.getStatus()).toBe("ready");
    expect(reader.getDevice()).toBe("tfjs-webgl");
    port.answer({ type: "seen", id: 1, seen });
    port.answer({ type: "seen", id: 2, seen });
    await expect(first).resolves.toEqual(seen);
    await expect(second).resolves.toEqual(seen);
    expect(port.sent[0]).toMatchObject({ type: "see", maps: true, features: false });
  });

  it("fails everything waiting when the model will not load, and starts afresh next time", async () => {
    const { reader, ports } = setup();
    const waiting = reader.see(picture());
    ports[0]!.answer({ type: "error", id: 1, stage: "load", message: "no model" });
    await expect(waiting).rejects.toMatchObject({ stage: "load" });
    expect(ports[0]!.terminated).toBe(true);
    expect(reader.getStatus()).toBe("idle");
    void reader.see(picture());
    expect(ports).toHaveLength(2);
  });

  it("gives up on a stalled load, and on a stuck picture once ready", async () => {
    const { reader, ports } = setup();
    const stalled = reader.see(picture());
    vi.advanceTimersByTime(LOAD_TIMEOUT_MS);
    await expect(stalled).rejects.toBeInstanceOf(VisionError);
    await expect(stalled).rejects.toMatchObject({ stage: "load" });

    const stuck = reader.fool(picture(), 1);
    ports[1]!.answer({ type: "ready", device: "tfjs-cpu" });
    vi.advanceTimersByTime(READ_TIMEOUT_MS);
    await expect(stuck).rejects.toMatchObject({ stage: "see" });
    expect(ports[1]!.terminated).toBe(true);
  });

  it("fails waiting pictures when the worker cannot start", async () => {
    const { reader, ports } = setup();
    const waiting = reader.see(picture());
    ports[0]!.onerror?.(new Event("error"));
    await expect(waiting).rejects.toMatchObject({ stage: "load" });
  });

  it("ends its worker a minute after the last scene lets go", async () => {
    const { reader, ports } = setup();
    const release = reader.retain();
    const answer = reader.see(picture());
    ports[0]!.answer({ type: "seen", id: 1, seen });
    await answer;
    release();
    release();
    vi.advanceTimersByTime(IDLE_MS - 1);
    expect(reader.running).toBe(true);
    vi.advanceTimersByTime(1);
    expect(reader.running).toBe(false);
    expect(ports[0]!.terminated).toBe(true);
  });
});
