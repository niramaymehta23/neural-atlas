import type { Reading } from "./attention";
import { AttentionReader, type AttentionPort } from "./attention-client";
import type { AttentionCommand, AttentionEvent } from "./protocol";

function fakeWorker(answer: (sentence: string) => AttentionEvent["type"]) {
  const sent: AttentionCommand[] = [];
  let starts = 0;
  const port: AttentionPort = {
    onmessage: null,
    postMessage(command) {
      sent.push(command);
      const reading: Reading = {
        tokens: [command.sentence],
        weights: new Float32Array(1),
        layers: 1,
        heads: 1,
      };
      const event: AttentionEvent =
        answer(command.sentence) === "reading"
          ? { type: "reading", id: command.id, reading }
          : { type: "error", id: command.id, message: "no model" };
      queueMicrotask(() => port.onmessage?.({ data: event } as MessageEvent<AttentionEvent>));
    },
  };
  const connect = () => {
    starts += 1;
    return port;
  };
  return { connect, sent, starts: () => starts };
}

describe("AttentionReader", () => {
  it("starts the worker on the first reading and remembers sentences", async () => {
    const worker = fakeWorker(() => "reading");
    const reader = new AttentionReader(worker.connect);
    expect(worker.starts()).toBe(0);
    const first = await reader.read("a cat");
    expect(first.tokens).toEqual(["a cat"]);
    expect(await reader.read("a cat")).toBe(first);
    await reader.read("a dog");
    expect(worker.starts()).toBe(1);
    expect(worker.sent.map(({ sentence }) => sentence)).toEqual(["a cat", "a dog"]);
  });

  it("rejects on a worker error and asks again next time", async () => {
    let fail = true;
    const worker = fakeWorker(() => (fail ? "error" : "reading"));
    const reader = new AttentionReader(worker.connect);
    await expect(reader.read("hello")).rejects.toThrow("no model");
    fail = false;
    await expect(reader.read("hello")).resolves.toMatchObject({ tokens: ["hello"] });
    expect(worker.sent).toHaveLength(2);
  });

  it("fails waiting readings when the worker cannot start, and starts afresh next time", async () => {
    let starts = 0;
    const silent: AttentionPort = { onmessage: null, postMessage() {} };
    const reader = new AttentionReader(() => {
      starts += 1;
      return silent;
    });
    const waiting = reader.read("a cat");
    silent.onerror?.(new Event("error"));
    await expect(waiting).rejects.toThrow();
    void reader.read("a cat").catch(() => {});
    expect(starts).toBe(2);
  });
});
