import { useEffect, useRef } from "react";

/**
 * Keeps `--stage-h` on the element equal to its height, so CSS can pin a tall stage by its
 * bottom part on a phone: the timeline and the lower scene stay in view while the dials scroll.
 * `--stage-min` holds the tallest height seen at this width, so the stage never shrinks under
 * the learner's finger (pressing start must not pull the dials up the page).
 */
export function useStageHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    let tallest = 0;
    let width = 0;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.borderBoxSize?.[0];
      const height = Math.round(box?.blockSize ?? element.offsetHeight);
      const across = Math.round(box?.inlineSize ?? element.offsetWidth);
      if (across !== width) {
        // A new width (a turned phone) lays the stage out afresh.
        width = across;
        tallest = 0;
        element.style.removeProperty("--stage-min");
      }
      element.style.setProperty("--stage-h", `${height}px`);
      if (height > tallest) {
        tallest = height;
        element.style.setProperty("--stage-min", `${height}px`);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return ref;
}
