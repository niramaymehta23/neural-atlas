import type { Prediction } from "@/platform/contract";
import { predictionWords } from "./captions";
import { NEVER, toolsOf, type AgentFrame, type AgentState } from "./model";

export const predictions = [
  {
    id: "never-give-up",
    question: predictionWords.question,
    choices: [
      { id: "wrong", label: predictionWords.wrong },
      { id: "forever", label: predictionWords.forever },
      { id: "cant", label: predictionWords.cant },
    ],
    // Told once a tool it needs is broken, it never gives up, and the whole run is on screen.
    answer: (_state, frame) =>
      !frame ||
      frame.patience < NEVER ||
      !toolsOf(frame.task).some((tool) => tool === frame.broken) ||
      frame.shown < frame.steps
        ? null
        : frame.outcome === "loop"
          ? "forever"
          : frame.outcome === "gaveUp"
            ? "cant"
            : "wrong",
  },
] as const satisfies readonly [Prediction<AgentState, AgentFrame>];
