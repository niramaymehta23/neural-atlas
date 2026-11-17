"use client";

import { GroupMark } from "@/data/GroupMark";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { PULL } from "./ClassicGarden";

type BrushPickerProps = {
  value: number;
  onChange: (brush: number) => void;
  /** "Tap to:", then each group's name (by the thing, not its colour), then pulling up. */
  words: { label: string; groups: readonly [string, string]; pull: string };
  /** A first choice of the lesson's own, such as asking about a spot. */
  first?: { value: number; label: string };
};

/** Which group a tap plants, shown by its shape as well as its name (A11Y-08), or pull up. */
export function BrushPicker({ value, onChange, words, first }: BrushPickerProps) {
  const options = [
    ...(first ? [{ value: String(first.value), label: first.label }] : []),
    { value: "0", label: words.groups[0], icon: <GroupMark group={0} /> },
    { value: "1", label: words.groups[1], icon: <GroupMark group={1} /> },
    { value: String(PULL), label: words.pull },
  ];
  return (
    <SegmentedControl
      label={words.label}
      showLabel
      options={options}
      value={String(value)}
      onChange={(brush) => onChange(Number(brush))}
    />
  );
}
