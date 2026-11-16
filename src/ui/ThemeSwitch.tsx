"use client";

import { applyTheme, type Theme } from "@/design/theme";
import { useTheme } from "@/design/use-theme";
import { SegmentedControl } from "./SegmentedControl";
import { uiCaptions } from "./captions";

const OPTIONS = [
  { value: "ivory", label: uiCaptions.theme.day },
  { value: "night", label: uiCaptions.theme.night },
] as const satisfies readonly { value: Theme; label: string }[];

/** Day (ivory) or night (charcoal) paper, remembered for next time. */
export function ThemeSwitch() {
  const theme = useTheme();
  return (
    <SegmentedControl
      label={uiCaptions.theme.label}
      options={OPTIONS}
      value={theme}
      onChange={applyTheme}
    />
  );
}
