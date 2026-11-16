"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, readTheme, subscribeToTheme, type Theme } from "@/design/theme";
import { SegmentedControl } from "./SegmentedControl";

const OPTIONS = [
  { value: "ivory", label: "Day" },
  { value: "night", label: "Night" },
] as const satisfies readonly { value: Theme; label: string }[];

/** Day (ivory) or night (charcoal) paper, remembered for next time. */
export function ThemeSwitch() {
  // The static HTML always renders ivory; the saved theme takes over once hydrated.
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, () => "ivory" as const);
  return (
    <SegmentedControl label="Page colour" options={OPTIONS} value={theme} onChange={applyTheme} />
  );
}
