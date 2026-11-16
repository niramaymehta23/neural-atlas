"use client";

import { applyTheme, type Theme } from "@/design/theme";
import { useTheme } from "@/design/use-theme";
import { SegmentedControl } from "./SegmentedControl";

const OPTIONS = [
  { value: "ivory", label: "Day" },
  { value: "night", label: "Night" },
] as const satisfies readonly { value: Theme; label: string }[];

/** Day (ivory) or night (charcoal) paper, remembered for next time. */
export function ThemeSwitch() {
  const theme = useTheme();
  return (
    <SegmentedControl label="Page colour" options={OPTIONS} value={theme} onChange={applyTheme} />
  );
}
