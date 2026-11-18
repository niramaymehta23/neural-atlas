// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "Inside a chatbot, words flow through a stack of thinking blocks. Each block looks around at the other words, thinks it over, and passes the words on. A shortcut runs past every block, like a river with streams joining it.",
  story:
    "With the shortcut, each block only adds its own stream to the river, so every word keeps what it was. Without it, each block replaces the words with its own mix, and after a few blocks every word turns into the same blur.",
  compare: {
    label: "Compare with the shortcut flipped",
    leftLabel: "Your blocks",
    rightLabel: "Shortcut flipped",
  },
};

export const words = {
  river:
    "A river of words: each line is one word of “the cat chased a red ball”, flowing left to right through the blocks. Lines far apart are words that are still different; lines that meet have blurred together.",
  start: "In",
  end: "Out",
  block: (at: number) => `Block ${count(at)}`,
  alike: (alike: number) => {
    if (alike < 0.5) return "The words are still clearly different from each other.";
    if (alike < 0.8) return "The words are growing alike.";
    if (alike < 0.95) return "The words are very alike.";
    return "The words have blurred into one: you can no longer tell them apart.";
  },
  meter: "How alike the words are at the end",
  blocks: {
    label: "How many blocks",
    describe: (value: number) =>
      `${sentenceStart(count(value))} ${value === 1 ? "block" : "blocks"}`,
  },
  strength: {
    label: "How much each block adds",
    describe: (value: number) =>
      value < 0.35 ? "A trickle" : value < 0.75 ? "A stream" : "A flood",
  },
  shortcut: "Shortcut past each block",
  describe: (blocks: number, shortcut: boolean, line: string) =>
    `${sentenceStart(count(blocks))} ${blocks === 1 ? "block" : "blocks"}, ${shortcut ? "with" : "without"} the shortcut. ${line}`,
  drawer: [
    {
      title: "What happens in a block",
      paragraphs: [
        "First each word looks around at the other words, as in “Who is looking at whom”, and gathers a mix of what it found. Then it thinks the mix over on its own. Before each step, the numbers are steadied so none grow huge.",
        "The shortcut adds what the block found to the word as it came in. Without it, the block's mix is all that is left, and mixing again and again makes every word the same average.",
        "The blocks here use made-up numbers, not learned ones. Real chatbots stack dozens of learned blocks.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is a transformer block with a residual connection: x ← x + MLP(LN(Attention(LN(x)))). Without the residual, x ← MLP(LN(Attention(LN(x)))).",
        "Repeated attention without residuals pushes the words towards one direction, which researchers call rank collapse. “How alike” measures the share of the words' size that all of them have in common.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Remove the shortcut and watch the words blur together",
  hint: "Switch the shortcut off, then add a few blocks.",
  success:
    "Without the shortcut, every block mixes the words again, and soon they all become the same blur. The shortcut lets each word keep what it was while blocks add to it, which is why very deep stacks can work at all.",
};

export const predictionWords = {
  question: "Take the shortcut away and pass the words through six blocks. What happens to them?",
  stay: "They stay different",
  blur: "They blur into one",
};
