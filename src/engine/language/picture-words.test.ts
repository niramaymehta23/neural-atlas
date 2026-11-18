// @vitest-environment node
import { loadMatcher, loadWordPlaces } from "./files";
import { captionPlace, matchOf, type Matcher } from "./picture-words";
import { readFilesFromDisk } from "./testing/disk-files";
import type { WordPlaces } from "./word-places";

readFilesFromDisk();
let matcher: Matcher;
let places: WordPlaces;
beforeAll(async () => {
  [matcher, places] = await Promise.all([loadMatcher(), loadWordPlaces()]);
}, 10_000);

const score = (caption: string, file: string) => {
  const place = captionPlace(matcher, places, caption);
  const photo = matcher.photos.find((entry) => entry.file === file);
  if (!place || !photo) throw new Error(`No place for ${caption} or ${file}`);
  return matchOf(place, photo.place);
};

const SHOWN = ["cat.jpg", "dog.jpg", "bananas.jpg", "teapot.jpg", "bicycle.jpg", "flowers-1.jpg"];

describe("the picture matcher", () => {
  it("scores each caption highest on its own photo", () => {
    const pairs: [string, string][] = [
      ["a sleepy cat", "cat.jpg"],
      ["a happy dog", "dog.jpg"],
      ["a bunch of bananas", "bananas.jpg"],
      ["a pot of tea", "teapot.jpg"],
      ["a bike to ride", "bicycle.jpg"],
      ["pink flowers", "flowers-1.jpg"],
    ];
    for (const [caption, file] of pairs) {
      const best = SHOWN.reduce((top, other) =>
        score(caption, other) > score(caption, top) ? other : top,
      );
      expect(best).toBe(file);
    }
  });

  it("can be fooled by a caption it never practised on", () => {
    // Measured: "a car" 0.78 on the bicycle.
    expect(score("a car", "bicycle.jpg")).toBeGreaterThan(0.7);
  });

  it("has no place for a caption with no words it knows", () => {
    expect(captionPlace(matcher, places, "zzzq 123")).toBeNull();
  });
});
