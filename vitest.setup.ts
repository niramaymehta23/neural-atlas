import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { mockReducedMotion } from "@/design/reduced-motion.mock";

const hasDom = typeof window !== "undefined";

if (hasDom) {
  // jsdom lacks these browser APIs that Radix, cmdk and motion rely on.
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
  Element.prototype.scrollIntoView = () => undefined;
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  beforeEach(() => mockReducedMotion(false));
}

afterEach(() => {
  if (hasDom) cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
