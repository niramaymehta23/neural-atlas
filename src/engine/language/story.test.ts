// @vitest-environment node
import { loadWriters } from "./files";
import { pick, chancesOf, type Sampling } from "./sampling";
import { continueStory, rollOf } from "./story";
import { readFilesFromDisk } from "./testing/disk-files";
import { createGpt, createReader, nextScores, type Gpt } from "./tiny-gpt";
import { letterIds, storyIds, type Writers } from "./writers";

readFilesFromDisk();
let writers: Writers;
beforeAll(async () => {
  writers = await loadWriters();
}, 10_000);

/** The story as it was first written: every word reads the whole story again. */
function slowStory(ids: readonly number[], count: number, sampling: Sampling, seed: number) {
  const all = [...ids];
  for (let step = 0; step < count; step += 1)
    all.push(
      pick(chancesOf(nextScores(writers.storyteller.gpt, all), sampling), rollOf(seed, step)),
    );
  return all.slice(ids.length);
}

function readsLikeAFullPass(gpt: Gpt, ids: readonly number[]) {
  const reader = createReader(gpt);
  ids.forEach((id, at) => {
    expect(Array.from(reader.read(id))).toEqual(Array.from(nextScores(gpt, ids.slice(0, at + 1))));
  });
  expect(reader.count()).toBe(ids.length);
}

describe("reading one piece at a time", () => {
  it("gives exactly the full pass's scores after every piece, up to a full view", () => {
    const { storyteller, writer } = writers;
    const story = slowStory(storyIds(storyteller, "the fox") ?? [], 46, { heat: 1 }, 7);
    readsLikeAFullPass(storyteller.gpt, [...(storyIds(storyteller, "the fox") ?? []), ...story]);
    const letters = letterIds(writer, "Hey diddle diddle, the cat and the fiddle, the cow jumped");
    readsLikeAFullPass(
      createGpt(writer.shape, writer.base),
      letters.slice(0, writer.shape.context),
    );
  });

  it("refuses more pieces than the view holds", () => {
    const { gpt } = writers.storyteller;
    const reader = createReader(gpt);
    for (let at = 0; at < gpt.shape.context; at += 1) reader.read(1);
    expect(() => reader.read(1)).toThrow();
  });
});

describe("continuing a story", () => {
  it("writes word for word what reading the whole story each time wrote", () => {
    const short = storyIds(writers.storyteller, "the cat sat on the") ?? [];
    const long = slowStory(short, 40, { heat: 1 }, 3);
    for (const [start, sampling, seed] of [
      [short, { heat: 1 }, 1],
      [short, { heat: 0 }, 1],
      [short, { heat: 2.5, choices: 5 }, 42],
      // Long enough that the view slides along partway through.
      [[...short, ...long], { heat: 0.7 }, 9],
    ] as const) {
      expect(continueStory(writers.storyteller, start, 30, sampling, seed)).toEqual(
        slowStory(start, 30, sampling, seed),
      );
    }
  });
});
