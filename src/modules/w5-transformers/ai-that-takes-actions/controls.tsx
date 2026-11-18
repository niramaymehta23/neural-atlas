"use client";

import type { ModuleViewProps } from "@/platform/contract";
import { Dial } from "@/ui/Dial";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { TOOLS, words, type Tool } from "./captions";
import { NEVER, toolsOf, type AgentFrame, type AgentState } from "./model";

const TASK_OPTIONS = [
  { value: "0", label: words.tasks.picnic },
  { value: "1", label: words.tasks.legs },
] as const;

export function AgentControls({ state, update }: ModuleViewProps<AgentState, AgentFrame>) {
  const broken = [
    { value: "none", label: words.broken.none },
    ...toolsOf(state.task).map((tool: Tool) => ({
      value: tool as string,
      label: words.brokenTool(TOOLS[tool]),
    })),
  ];
  return (
    <>
      <SegmentedControl
        label={words.tasks.label}
        showLabel
        options={TASK_OPTIONS}
        value={String(state.task) as "0" | "1"}
        onChange={(task) => update({ task: Number(task), broken: "none", shown: 1 })}
      />
      <SegmentedControl
        label={words.broken.label}
        showLabel
        vertical
        options={broken}
        value={broken.some(({ value }) => value === state.broken) ? state.broken : "none"}
        onChange={(value) => update({ broken: value, shown: 1 })}
      />
      <Dial
        label={words.patience.label}
        value={state.patience}
        min={1}
        max={NEVER}
        step={1}
        onChange={(patience) => update({ patience, shown: 1 })}
        describe={(value) => words.patience.describe(value, value >= NEVER)}
      />
    </>
  );
}
