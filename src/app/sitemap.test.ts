import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists the map, the puzzle, the experiences and all 74 lessons, once each", () => {
    const urls = sitemap().map(({ url }) => new URL(url).pathname);
    expect(urls).toHaveLength(85);
    expect(new Set(urls).size).toBe(85);
    expect(urls).toContain("/");
    expect(urls).toContain("/puzzle");
    expect(urls).toContain("/learn/rolling-downhill");
    for (const path of [
      "/explore",
      "/sandbox",
      "/journeys",
      "/journeys/how-chatgpt-works",
      "/museum",
      "/theatre",
      "/two-player",
    ])
      expect(urls).toContain(path);
  });
});
