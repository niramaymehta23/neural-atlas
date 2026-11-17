import {
  createProgress,
  createSession,
  ReaderFailure,
  type LoadedModel,
} from "./attention-session";
import { MOST_LETTERS, MOST_WORDS } from "./attention";

/** A fake model: one piece per letter-group, attention spread evenly over 1 layer × 1 head. */
function fakeModel(fail?: (text: string) => boolean): LoadedModel & { texts: string[] } {
  const texts: string[] = [];
  return {
    texts,
    pieces: (word) => (word === "can't" ? 3 : 1),
    async attend(text) {
      texts.push(text);
      if (fail?.(text)) throw new Error("no reading");
      const size = 2 + text.split(" ").reduce((sum, word) => sum + (word === "can't" ? 3 : 1), 0);
      return { dims: [1, 1, 1, size, size], data: new Float32Array(size * size).fill(1 / size) };
    },
  };
}

describe("createSession", () => {
  it("reads the learner's words with how many pieces each became", async () => {
    const session = createSession(async () => fakeModel());
    const reading = await session.read("Héllo, can't 😀");
    expect(reading.words).toEqual(["Héllo,", "can't", "😀"]);
    expect(reading.pieces).toEqual([1, 3, 1]);
    expect(reading.weights).toHaveLength(7 * 7);
  });

  it("a sentence it cannot read keeps the loaded model (ATT-06)", async () => {
    const load = vi.fn(async () => fakeModel((text) => text.includes("bad")));
    const session = createSession(load);
    await session.read("good words");
    const failed = session.read("bad words");
    await expect(failed).rejects.toBeInstanceOf(ReaderFailure);
    await expect(failed).rejects.toMatchObject({ stage: "read" });
    await session.read("good again");
    expect(load).toHaveBeenCalledOnce();
  });

  it("a failed load is tried again next time", async () => {
    let fail = true;
    const load = vi.fn(async () => {
      if (fail) throw new Error("no model");
      return fakeModel();
    });
    const session = createSession(load);
    await expect(session.read("a cat")).rejects.toMatchObject({ stage: "load" });
    fail = false;
    await expect(session.read("a cat")).resolves.toMatchObject({ words: ["a", "cat"] });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never hands the model more than the lesson reads", async () => {
    const model = fakeModel();
    const session = createSession(async () => model);
    await session.read("word ".repeat(400));
    const [text] = model.texts;
    expect(text!.length).toBeLessThanOrEqual(MOST_LETTERS);
    expect(text!.split(" ").length).toBeLessThanOrEqual(MOST_WORDS);
  });

  it("refuses a reading whose pieces do not line up with the words", async () => {
    const session = createSession(async () => ({ ...fakeModel(), pieces: () => 2 }));
    await expect(session.read("a cat")).rejects.toMatchObject({ stage: "read" });
  });
});

describe("createProgress", () => {
  it("blends the runtime and the model files and never goes backwards", () => {
    const seen: number[] = [];
    const progress = createProgress((fraction) => seen.push(fraction), 0.4);
    progress.runtime(50, 100);
    expect(seen.at(-1)).toBeCloseTo(0.2);
    progress.runtime(100, 100);
    expect(seen.at(-1)).toBeCloseTo(0.4);
    progress.file("model.onnx", 10, 100);
    progress.file("tokenizer.json", 0, 100); // a new file appears: the share would drop
    progress.fileDone("tokenizer.json");
    progress.fileDone("model.onnx");
    expect(seen.at(-1)).toBeCloseTo(1);
    for (let index = 1; index < seen.length; index += 1)
      expect(seen[index]).toBeGreaterThanOrEqual(seen[index - 1]!);
  });
});
