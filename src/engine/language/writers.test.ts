// @vitest-environment node
import { loadWriters } from "./files";
import { chancesOf, likeliest } from "./sampling";
import { readFilesFromDisk } from "./testing/disk-files";
import { nextScores } from "./tiny-gpt";
import { letterIds, readWriters, storyIds, type Writers } from "./writers";

readFilesFromDisk();
let writers: Writers;
beforeAll(async () => {
  writers = await loadWriters();
}, 10_000);

const chances = (text: string) => {
  const ids = storyIds(writers.storyteller, text);
  if (!ids) throw new Error(`Unknown words in "${text}"`);
  return chancesOf(nextScores(writers.storyteller.gpt, ids), { heat: 1 });
};
const best = (text: string) => {
  const [top] = likeliest(chances(text), 1);
  return { word: writers.storyteller.words[top?.id ?? 0], chance: top?.chance ?? 0 };
};

describe("the tiny writers", () => {
  it("score exactly as PyTorch did (the fixtures in the manifest)", async () => {
    const { readDisk } = await import("./testing/disk-files");
    const manifest = JSON.parse(
      new TextDecoder().decode(await readDisk("models/tiny-writers-v1/manifest.json")),
    );
    const story = manifest.storyteller.fixture;
    const ours = nextScores(
      writers.storyteller.gpt,
      storyIds(writers.storyteller, story.words.join(" ")) ?? [],
    );
    story.scores.forEach((score: number, at: number) => expect(ours[at]).toBeCloseTo(score, 3));
    const { createGpt } = await import("./tiny-gpt");
    const letters = createGpt(writers.writer.shape, writers.writer.base);
    const fixture = manifest.writer.fixture;
    const scores = nextScores(letters, letterIds(writers.writer, fixture.text));
    fixture.scores.forEach((score: number, at: number) => expect(scores[at]).toBeCloseTo(score, 3));
  });

  it("refuses a file that is cut short", async () => {
    const { readDisk } = await import("./testing/disk-files");
    const manifest = JSON.parse(
      new TextDecoder().decode(await readDisk("models/tiny-writers-v1/manifest.json")),
    );
    expect(() => readWriters(manifest, new ArrayBuffer(400), new ArrayBuffer(400))).toThrow();
  });

  it("finishes the cat's sentence with the mat", () => {
    const { word, chance } = best("the cat sat on the");
    expect(word).toBe("mat");
    expect(chance).toBeGreaterThan(0.9);
  });

  it("recalls a pet's name only while the name is in view", () => {
    const talk =
      "my cat is called maple . the boy ran to the park . the girl ate an apple . the baby slept in the sun . the dog sat on the rug . what is my cat called ? my cat is called";
    expect(best(talk).word).toBe("maple");
    const words = talk.split(" ");
    const outOfView = best(words.slice(-30).join(" "));
    expect(outOfView.word).not.toBe("maple");
    expect(outOfView.chance).toBeLessThan(0.2);
  });

  it("makes up a colour it never read, and sounds sure of it", () => {
    // Measured: "brown" at 0.925 for the hen, whose colour is never in its practice text.
    expect(writers.animals.hen?.colour).toBeNull();
    const { word, chance } = best("what colour is the hen ? the hen is");
    expect(word).toBe("brown");
    expect(chance).toBeGreaterThan(0.9);
  });
});
