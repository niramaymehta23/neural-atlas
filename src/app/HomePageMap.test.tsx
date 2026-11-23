import { extraPlaces } from "@/constellation/layout";
import { achievements } from "@/experiences/achievements/achievements";

describe("the home map's earned stars", () => {
  it("has a place for every achievement", () => {
    expect(extraPlaces().length).toBeGreaterThanOrEqual(achievements.length);
  });
});
