// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "Some chatbots don't just talk: they act. Given a job, they think, use a tool, check what came back, and repeat until they are done. Watch one at work, then see what happens when a tool breaks.",
  story:
    "An agent is a loop: think, act, check. That loop is what lets it finish real jobs. It is also why it needs a rule for when to stop, or a broken tool can keep it trying for ever.",
  compare: {
    label: "Compare with an agent that gives up after two tries",
    leftLabel: "Your agent",
    rightLabel: "Gives up after two",
  },
};

export const TOOLS = {
  weather: "the weather tool",
  converter: "the temperature converter",
  calculator: "the calculator",
} as const;
export type Tool = keyof typeof TOOLS;

/** What each job asks, and the agent's plan for it. */
export const TASKS = [
  {
    ask: "Is it warm enough for a picnic in Paris today? Tell me in Celsius.",
    plan: [
      { kind: "think", text: "I need today's weather in Paris." },
      {
        kind: "tool",
        tool: "weather",
        input: "Paris, today",
        output: "68 degrees Fahrenheit and sunny",
      },
      { kind: "think", text: "That's in Fahrenheit, but they asked for Celsius. I'll convert it." },
      {
        kind: "tool",
        tool: "converter",
        input: "68 Fahrenheit to Celsius",
        output: "20 degrees Celsius",
      },
      { kind: "check", text: "20 degrees and sunny is a warm day, so a picnic sounds fine." },
      {
        kind: "answer",
        text: "Yes! It's about 20 degrees Celsius and sunny in Paris: good picnic weather.",
      },
    ],
  },
  {
    ask: "How many legs do 3 spiders and 2 ants have altogether?",
    plan: [
      { kind: "think", text: "Spiders have 8 legs and ants have 6. I'll work out 3 × 8 + 2 × 6." },
      { kind: "tool", tool: "calculator", input: "3 × 8 + 2 × 6", output: "36" },
      { kind: "check", text: "3 × 8 is 24 and 2 × 6 is 12, and 24 + 12 is 36. That checks out." },
      { kind: "answer", text: "They have 36 legs altogether." },
    ],
  },
] as const;

export const words = {
  task: "The job",
  tasks: { label: "Which job", picnic: "Picnic weather", legs: "Counting legs" },
  stage: "What the agent does, step by step",
  kinds: {
    think: "Thinks",
    tool: "Uses a tool",
    result: "Sees",
    failed: "Sees an error",
    check: "Checks",
    answer: "Answers",
    stopped: "Stopped",
  },
  uses: (tool: string, input: string) => `Asks ${tool}: “${input}”`,
  result: (output: string) => `It says: ${output}.`,
  error: (tool: string) => `${sentenceStart(tool)} didn't answer. I'll try again.`,
  giveUp: (tool: string) => `Sorry, ${tool} isn't working, so I can't answer this for sure.`,
  stopped: "The safety limit stopped it. It would have kept trying for ever.",
  cutOff: "The safety limit stopped it before it ran out of tries.",
  step: (at: number, total: number) => `Step ${count(at)} of ${count(total)}`,
  next: "Next step",
  all: "Show every step",
  again: "Start again",
  broken: { label: "Break a tool", none: "Nothing broken" },
  brokenTool: (tool: string) => `Break ${tool}`,
  patience: {
    label: "How many tries before it gives up",
    describe: (value: number, never: boolean) =>
      never
        ? "Never gives up"
        : value === 1
          ? "Gives up after one try"
          : `Gives up after ${count(value)} tries`,
  },
  limit: {
    label: "The most steps it may take",
    describe: (value: number) => `${sentenceStart(count(value))} steps at most`,
  },
  outcome: {
    done: "It finished the job.",
    gaveUp: "It gave up and said so honestly.",
    loop: "It's trapped in a loop: the same failing step, again and again.",
    cutOff: "The safety limit cut it off before it could finish or give up.",
  },
  describe: (shown: string, outcome: string) => `${shown}. ${outcome}`,
  drawer: [
    {
      title: "How an agent works",
      paragraphs: [
        "An agent is a chatbot run in a loop. Each time round, it writes what it thinks, then either picks a tool to use or gives its answer. The tool's result is added to what it reads next time round.",
        "Tools can be anything a program can do: look up the weather, run a calculation, search the web, or click buttons. The agent only sees the tool's answer, so a broken tool looks like bad luck, and trying again seems sensible.",
        "This agent follows a script, so it acts the same way every time. Real agents write each step themselves, but they get stuck in the same kind of loop.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is the ReAct pattern: reason, act, observe, repeat. Agents are given a step budget and stopping rules, such as giving up after repeated identical failures, to keep loops finite.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Trap it in an endless loop",
  hint: "Break a tool it needs and tell it never to give up, then watch every step.",
  success:
    "With a broken tool and no rule for when to stop, the agent kept trying the same thing. Real agents are given limits and stopping rules so a failure can't trap them.",
};

export const predictionWords = {
  question: "Break the tool it needs and tell it never to give up. What will the agent do?",
  wrong: "Make up an answer",
  forever: "Keep trying for ever",
  cant: "Say it can't do it",
};
