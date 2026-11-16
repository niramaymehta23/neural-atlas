import { useSyncExternalStore } from "react";
import { readTheme, subscribeToTheme, type Theme } from "./theme";

/**
 * The current theme, re-rendering on change. The static HTML is always ivory until hydrated.
 * Kept apart from theme.ts, which the server-rendered layout imports.
 */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeToTheme, readTheme, () => "ivory" as const);
}
