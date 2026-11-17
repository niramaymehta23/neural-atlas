import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists the map, the puzzle and all 74 lessons, once each", () => {
    const urls = sitemap().map(({ url }) => new URL(url).pathname);
    expect(urls).toHaveLength(76);
    expect(new Set(urls).size).toBe(76);
    expect(urls).toContain("/");
    expect(urls).toContain("/puzzle");
    expect(urls).toContain("/learn/rolling-downhill");
  });
});
