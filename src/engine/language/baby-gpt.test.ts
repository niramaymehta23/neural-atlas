// @vitest-environment node
import { createWriterRun, MOMENT_EVERY, type WriterRunConfig } from "./baby-gpt";
import { loadWriters } from "./files";
import { readFilesFromDisk } from "./testing/disk-files";
import { createWriterHost } from "./writer-host";
import type { WriterEvent } from "./writer-protocol";
import { letterIds, lettersOf } from "./writers";

readFilesFromDisk();
const LETTERS = `\n${Array.from({ length: 95 }, (_, at) => String.fromCharCode(32 + at)).join("")}`;
/** Smaller than the lesson writer, so the mechanics are checked quickly even on a busy machine. */
const SHAPE = { vocab: LETTERS.length, context: 24, width: 24, heads: 2, layers: 2 };
const TEXT =
  "Twinkle, twinkle, little star, how I wonder what you are. Up above the world so high, like a diamond in the sky.";

const fresh = (change: Partial<WriterRunConfig> = {}): WriterRunConfig => ({
  shape: SHAPE,
  base: null,
  text: letterIds({ letters: LETTERS }, TEXT),
  everyday: null,
  learningRate: 3e-3,
  batch: 8,
  seed: 4,
  prompt: letterIds({ letters: LETTERS }, "Tw"),
  sampleLength: 20,
  ...change,
});

function practise(config: WriterRunConfig, steps: number) {
  const run = createWriterRun(config);
  const moments = [run.moment()];
  while (run.step < steps) {
    run.advance();
    if (run.step % MOMENT_EVERY === 0) moments.push(run.moment());
  }
  return moments;
}

describe("baby GPT", () => {
  it("gets less surprised as it reads, the same way every time (fixed seed)", () => {
    const moments = practise(fresh(), 150);
    const losses = moments.map(({ loss }) => loss);
    expect(losses[0]).toBeGreaterThan(4);
    expect(losses.at(-1)).toBeLessThan(losses[0]! / 2);
    for (let at = 2; at < losses.length; at += 1) expect(losses[at]).toBeLessThan(losses[0]!);
    expect(practise(fresh(), 150)).toEqual(moments);
  }, 60_000);

  it("replays the same moments however its steps are sliced (links replay exactly)", async () => {
    const run = async (later: (next: () => void) => void) => {
      const events: WriterEvent[] = [];
      let done: () => void = () => {};
      const finished = new Promise<void>((resolve) => (done = resolve));
      let clock = 0;
      const host = createWriterHost(
        (event) => {
          events.push(event);
          if (event.type === "stopped") done();
        },
        later,
        () => (clock += 5),
      );
      host({ type: "start", run: 1, config: fresh() });
      host({ type: "go", run: 1, until: 75 });
      await finished;
      return events.filter((event) => event.type === "moment");
    };
    const quick = await run((next) => setTimeout(next, 0));
    const slow = await run((next) => setTimeout(next, 3));
    expect(quick.map((event) => event.type === "moment" && event.step)).toEqual([0, 25, 50, 75]);
    expect(slow).toEqual(quick);
  }, 60_000);

  it("reports a text too short to read instead of breaking", () => {
    const events: WriterEvent[] = [];
    const host = createWriterHost((event) => events.push(event));
    host({ type: "start", run: 1, config: fresh({ text: [5] }) });
    expect(events).toEqual([
      { type: "error", message: "Baby GPT needs at least two letters to read." },
    ]);
  });

  it("starts writing pirate talk within a hundred steps of practice from the pretrained writer", async () => {
    const writers = await loadWriters();
    const { writer } = writers;
    const pirate =
      "Arr, ahoy me hearties! Ye be sailin' on the salty sea. The captain be lookin' for treasure, matey. Hoist the sails and swab the deck!";
    const moments = practise(
      fresh({
        shape: writer.shape,
        base: writer.base,
        text: letterIds(writer, pirate),
        everyday: letterIds(writer, writer.everyday.slice(0, 400)),
        prompt: letterIds(writer, "The cat "),
        sampleLength: 60,
      }),
      100,
    );
    const first = moments[0]!;
    const last = moments.at(-1)!;
    expect(lettersOf(writer, first.sample)).not.toMatch(/\b(be|ye|arr|matey|me)\b/i);
    expect(lettersOf(writer, last.sample)).toMatch(/\b(be|ye|arr|matey|me)\b/i);
    expect(last.loss).toBeLessThan(first.loss / 3);
    expect(last.everyday ?? 0).toBeGreaterThan(first.everyday ?? 0);
  }, 60_000);
});
