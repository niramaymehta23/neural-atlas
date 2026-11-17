import type { Reading } from "./attention";
import {
  AttentionReader,
  IDLE_MS,
  MEMORY_BYTES,
  READ_TIMEOUT_MS,
  ReaderError,
  STALL_TIMEOUT_MS,
  type AttentionPort,
} from "./attention-client";
import type { AttentionCommand, AttentionEvent } from "./protocol";

type Answer = "reading" | "load" | "read" | "silent";

/** A fake worker answering each sentence as `answer` says; readings weigh `bytes`. */
function fakeWorker(answer: (sentence: string) => Answer = () => "reading", bytes = 4) {
  const sent: AttentionCommand[] = [];
  const ports: (AttentionPort & { terminate: ReturnType<typeof vi.fn> })[] = [];
  const connect = () => {
    const port = {
      onmessage: null,
      onerror: null,
      terminate: vi.fn(),
      postMessage(command: AttentionCommand) {
        sent.push(command);
        const how = answer(command.sentence);
        if (how === "silent") return;
        const reading: Reading = {
          words: [command.sentence],
          pieces: [1],
          weights: new Float32Array(bytes / 4),
          layers: 1,
          heads: 1,
        };
        const event: AttentionEvent =
          how === "reading"
            ? { type: "reading", id: command.id, reading }
            : { type: "error", id: command.id, stage: how, message: "no" };
        queueMicrotask(() => port.onmessage?.({ data: event } as MessageEvent<AttentionEvent>));
      },
    } as AttentionPort & { terminate: ReturnType<typeof vi.fn> };
    ports.push(port);
    return port;
  };
  const tell = (event: AttentionEvent) =>
    ports.at(-1)?.onmessage?.({ data: event } as MessageEvent<AttentionEvent>);
  return { connect, sent, ports, tell };
}

describe("AttentionReader", () => {
  it("starts the worker on the first reading and remembers sentences", async () => {
    const worker = fakeWorker();
    const reader = new AttentionReader(worker.connect);
    expect(worker.ports).toHaveLength(0);
    const first = await reader.read("a cat");
    expect(first.words).toEqual(["a cat"]);
    expect(await reader.read("a  cat ")).toBe(first); // read the same way: same reading
    await reader.read("a dog");
    expect(worker.ports).toHaveLength(1);
    expect(worker.sent.map(({ sentence }) => sentence)).toEqual(["a cat", "a dog"]);
  });

  it("says whether the model failed to load or one sentence failed (ATT-06)", async () => {
    let how: Answer = "load";
    const reader = new AttentionReader(fakeWorker(() => how).connect);
    await expect(reader.read("hello")).rejects.toEqual(new ReaderError("load", "no"));
    how = "read";
    await expect(reader.read("hello")).rejects.toMatchObject({ stage: "read" });
    how = "reading";
    await expect(reader.read("hello")).resolves.toMatchObject({ words: ["hello"] });
  });

  it("fails waiting readings when the worker cannot start, and starts afresh next time", async () => {
    const worker = fakeWorker(() => "silent");
    const reader = new AttentionReader(worker.connect);
    const waiting = reader.read("a cat");
    worker.ports[0]!.onerror?.(new Event("error"));
    await expect(waiting).rejects.toMatchObject({ stage: "load" });
    expect(worker.ports[0]!.terminate).toHaveBeenCalledOnce();
    void reader.read("a cat").catch(() => {});
    expect(worker.ports).toHaveLength(2);
  });

  it("forgets the least recently used readings once they weigh too much (ATT-16)", async () => {
    const worker = fakeWorker(() => "reading", MEMORY_BYTES / 3);
    const reader = new AttentionReader(worker.connect);
    const a = await reader.read("a");
    await reader.read("b");
    await reader.read("c");
    expect(await reader.read("a")).toBe(a); // "a" is used again, so "b" is now the oldest
    await reader.read("d");
    await reader.read("a");
    await reader.read("b");
    expect(worker.sent.map(({ sentence }) => sentence)).toEqual(["a", "b", "c", "d", "b"]);
  });

  it("tells listeners how far a first load has got, then that it is done (ATT-03)", async () => {
    const worker = fakeWorker(() => "silent");
    const reader = new AttentionReader(worker.connect);
    const seen: (number | null)[] = [];
    reader.subscribe(() => seen.push(reader.getProgress()));
    const reading = reader.read("a cat");
    worker.tell({ type: "progress", fraction: 0.3 });
    worker.tell({ type: "progress", fraction: 0.8 });
    worker.tell({
      type: "reading",
      id: 1,
      reading: { words: [], pieces: [], weights: new Float32Array(), layers: 1, heads: 1 },
    });
    await reading;
    expect(seen).toEqual([0, 0.3, 0.8, null]);
  });

  describe("timeouts and resting", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("waits as long as the model keeps arriving, but gives up on a stall", async () => {
      const worker = fakeWorker(() => "silent");
      const reader = new AttentionReader(worker.connect);
      const waiting = reader.read("a cat");
      const settled = expect(waiting).rejects.toMatchObject({ stage: "load" });
      for (let step = 0; step < 5; step += 1) {
        vi.advanceTimersByTime(STALL_TIMEOUT_MS - 1);
        worker.tell({ type: "progress", fraction: step / 10 });
      }
      expect(worker.ports[0]!.terminate).not.toHaveBeenCalled();
      vi.advanceTimersByTime(STALL_TIMEOUT_MS);
      await settled;
      expect(worker.ports[0]!.terminate).toHaveBeenCalledOnce();
      expect(reader.getProgress()).toBeNull();
      void reader.read("a cat").catch(() => {});
      expect(worker.ports).toHaveLength(2);
    });

    it("gives a loaded reader a shorter wait per reading", async () => {
      let answer: Answer = "reading";
      const reader = new AttentionReader(fakeWorker(() => answer).connect);
      await reader.read("a cat");
      answer = "silent";
      const settled = expect(reader.read("a dog")).rejects.toMatchObject({ stage: "read" });
      vi.advanceTimersByTime(READ_TIMEOUT_MS);
      await settled;
    });

    it("ends the worker a minute after the last scene lets go, and only then (ENG-13)", async () => {
      const worker = fakeWorker();
      const reader = new AttentionReader(worker.connect);
      const first = reader.retain();
      const second = reader.retain();
      await reader.read("a cat");
      first();
      first(); // letting go twice counts once
      vi.advanceTimersByTime(IDLE_MS * 2);
      expect(reader.running).toBe(true);
      second();
      vi.advanceTimersByTime(IDLE_MS - 1);
      expect(reader.running).toBe(true);
      const again = reader.retain(); // back within the minute: kept
      vi.advanceTimersByTime(IDLE_MS * 2);
      expect(reader.running).toBe(true);
      again();
      vi.advanceTimersByTime(IDLE_MS);
      expect(reader.running).toBe(false);
      expect(worker.ports[0]!.terminate).toHaveBeenCalledOnce();
      // Remembered sentences need no worker; a new one starts a fresh worker.
      await reader.read("a cat");
      expect(worker.ports).toHaveLength(1);
      void reader.read("a dog");
      expect(worker.ports).toHaveLength(2);
    });
  });
});
