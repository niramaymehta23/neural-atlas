import { count } from "@/design/copy";

/** Words for the compute meter. */
export const meterCaptions = {
  label: "How much computing this took",
  none: "No multiplying yet.",
  remembered: "It only remembered, so learning took no multiplying at all.",
  so_far: (times: number) => `${count(times)} small multiplications so far.`,
  answer: (times: number) =>
    times <= 1 ? "Each answer takes next to none." : `Each answer takes ${count(times)} more.`,
  reply: (runs: number) =>
    runs >= 2
      ? `It would take ${count(runs)} runs like this one to match one short reply from a big chatbot.`
      : "That is about as many as a short reply from a big chatbot.",
  scale: "Each dot along is ten times as much. The ring marks a chatbot’s short reply.",
  lead: "The real word is",
  term: "compute",
};
