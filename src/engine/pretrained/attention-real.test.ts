// @vitest-environment node
/**
 * The real model, run in Node from the files the site serves: the learner's words line up with
 * its pieces, and the recorded fixture the lesson tests use still matches what it does.
 */
import { readFile } from "node:fs/promises";
import { loadReading, type StoredReading } from "./testing/fixture";
import { nodeSession } from "./testing/node-model";

const session = nodeSession();

describe("the real attention model", () => {
  it("reads accents, contractions and pictures as the learner's own words (ATT-04)", async () => {
    const reading = await session.read("Héllo, can't 😀");
    expect(reading.words).toEqual(["Héllo,", "can't", "😀"]);
    expect(reading.pieces.every((count) => count >= 1)).toBe(true);
    expect(reading.layers).toBe(6);
    expect(reading.heads).toBe(12);
  });

  it("still reads the example sentence as recorded in the fixture", async () => {
    const stored = JSON.parse(
      await readFile(new URL("./testing/example-reading.json", import.meta.url), "utf8"),
    ) as StoredReading;
    const recorded = loadReading(stored);
    const live = await session.read(stored.sentence);
    expect(live.words).toEqual(recorded.words);
    expect(live.pieces).toEqual(recorded.pieces);
    let largest = 0;
    live.weights.forEach((value, index) => {
      largest = Math.max(largest, Math.abs(value - (recorded.weights[index] ?? 0)));
    });
    expect(largest).toBeLessThan(1e-4);
  });
});
