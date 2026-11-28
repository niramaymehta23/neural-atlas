/**
 * Tells `change` whenever this tab is hidden or shown again (and at once when it is hidden now).
 * The one look at the page in the engine: workers are not slowed down in a hidden tab, and have
 * no way to know, so the page's handle on each worker tells it. Returns a function that stops.
 */
export function onTabHidden(change: (hidden: boolean) => void): () => void {
  if (typeof document === "undefined") return () => undefined;
  const tell = () => change(document.hidden);
  if (document.hidden) tell();
  document.addEventListener("visibilitychange", tell);
  return () => document.removeEventListener("visibilitychange", tell);
}
