import { renderHook } from "@testing-library/react";
import { cameraGlide, springs, useSpring } from "./motion";
import { mockReducedMotion } from "./reduced-motion.mock";

describe("useSpring", () => {
  it("returns the named spring normally", () => {
    mockReducedMotion(false);
    expect(renderHook(() => useSpring("gentle")).result.current).toBe(springs.gentle);
  });

  it("changes instantly under reduced motion", () => {
    mockReducedMotion(true);
    expect(renderHook(() => useSpring()).result.current).toEqual({ duration: 0 });
  });
});

describe("springs", () => {
  it("settle within 200–400 ms", () => {
    for (const spring of Object.values(springs)) {
      const seconds = "visualDuration" in spring ? spring.visualDuration : spring.duration;
      expect(seconds).toBeGreaterThanOrEqual(0.2);
      expect(seconds).toBeLessThanOrEqual(0.4);
    }
  });
});

describe("cameraGlide", () => {
  it("lands a home-map flight within 1.2 s", () => {
    expect(cameraGlide.duration).toBeLessThanOrEqual(1.2);
  });
});
