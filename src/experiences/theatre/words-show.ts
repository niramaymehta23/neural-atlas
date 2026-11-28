import { sentenceStart } from "@/design/copy";
import { chancesOf, pick } from "@/engine/language/sampling";
import { rollOf, topWords, type WordChance } from "@/engine/language/story";
import { createReader } from "@/engine/language/tiny-gpt";
import { storyIds, type Storyteller } from "@/engine/language/writers";
import { theatreCaptions as words } from "./captions";
import type { Show } from "./painter";

/** A story ends at a full stop after this many words, or when the storyteller's view is full. */
const ENOUGH = 26;
const CHOICES = 6;
const SAMPLING = { heat: 0.9, choices: 12 };
const SECONDS = { weigh: 1.3, choose: 0.7, rest: 3.5 };
const OPENINGS = ["the", "my", "a"];

type Phase = "weigh" | "choose" | "rest";

/** A story as it is read: capitals at the start of a sentence, no gap before a full stop. */
export function storyText(list: readonly string[]): string {
  let text = "";
  let start = true;
  for (const word of list) {
    const mark = word === "." || word === "?";
    text += mark ? word : `${text ? " " : ""}${start ? sentenceStart(word) : word}`;
    start = mark;
  }
  return text;
}

/** The storyteller writing: the likeliest next words weighed as bars, one picked, again and again. */
export function createWordsShow(teller: Storyteller, seed = 1): Show {
  let story = 0;
  let ids: number[] = [];
  let line: string[] = [];
  let reader = createReader(teller.gpt);
  let scores: Float64Array = new Float64Array();
  let choices: readonly WordChance[] = [];
  let chosen = -1;
  let phase: Phase = "weigh";
  let clock = 0;

  const add = (id: number) => {
    ids.push(id);
    line.push(teller.words[id] ?? "");
    scores = reader.read(id);
  };
  const weigh = () => {
    const chances = chancesOf(scores, SAMPLING);
    const id = pick(chances, rollOf(seed + story, ids.length));
    choices = topWords(teller, chances, CHOICES);
    const word = teller.words[id] ?? "";
    // A pick from further down the list takes the last bar's place, so what is picked is shown.
    if (!choices.some((choice) => choice.word === word))
      choices = [...choices.slice(0, CHOICES - 1), { word, chance: chances[id] ?? 0 }];
    chosen = id;
    phase = "weigh";
  };
  const begin = () => {
    story += 1;
    ids = [];
    line = [];
    reader = createReader(teller.gpt);
    const opening = OPENINGS[story % OPENINGS.length] ?? "the";
    for (const id of storyIds(teller, opening) ?? [0]) add(id);
    weigh();
  };
  const turn = () => {
    if (phase === "weigh") phase = "choose";
    else if (phase === "choose") {
      const ending = teller.words[chosen] === ".";
      add(chosen);
      if ((ending && ids.length >= ENOUGH) || ids.length >= teller.gpt.shape.context - 1)
        phase = "rest";
      else weigh();
    } else begin();
  };
  begin();
  /** How far the bars have grown towards what was weighed, 0–1. */
  const grownBy = (still: boolean) =>
    phase === "weigh" && !still ? Math.min(1, clock / (SECONDS.weigh * 0.6)) : 1;

  return {
    advance(seconds) {
      clock += seconds;
      // Never more than a few turns at once, however long the page slept.
      for (let turns = 0; clock >= SECONDS[phase] && turns < 4; turns += 1) {
        clock -= SECONDS[phase];
        turn();
      }
      clock = Math.min(clock, SECONDS[phase]);
    },
    draw({ context, width, height, palette, serif, sans, still }) {
      const size = Math.max(20, Math.min(width / 24, height / 14, 44));
      const margin = Math.max(24, width * 0.1);
      context.textBaseline = "alphabetic";
      context.textAlign = "left";
      context.font = `${size}px ${serif}`;
      context.fillStyle = palette.ink;
      const text = storyText(line);
      let y = Math.max(size * 2.5, height * 0.16);
      let row = "";
      for (const word of text.split(" ")) {
        const longer = row ? `${row} ${word}` : word;
        if (row && context.measureText(longer).width > width - margin * 2) {
          context.fillText(row, margin, y);
          y += size * 1.4;
          row = word;
        } else row = longer;
      }
      context.fillText(row, margin, y);
      if (phase === "rest") return;
      // The place the next word will go.
      const end = margin + context.measureText(row).width + size * 0.3;
      context.fillStyle = palette.accent;
      context.fillRect(end, y + size * 0.12, size * 1.6, 3);

      const small = size * 0.62;
      const gap = small * 1.9;
      const top = height - margin * 0.6 - gap * CHOICES - size;
      const start = Math.max(y + size * 1.6, top);
      const labels = Math.min(width * 0.26, 220);
      const longest = width - margin * 2 - labels - 24;
      const grown = grownBy(still);
      const most = Math.max(0.0001, ...choices.map(({ chance }) => chance));
      context.font = `${small}px ${sans}`;
      choices.forEach(({ word, chance }, index) => {
        const middle = start + gap * index;
        const taken = phase === "choose" && word === teller.words[chosen];
        context.textAlign = "right";
        context.fillStyle = phase === "choose" && !taken ? palette.soft : palette.ink;
        context.fillText(word, margin + labels, middle + small * 0.35);
        context.fillStyle = taken ? palette.accent : palette.soft;
        context.fillRect(
          margin + labels + 24,
          middle - small * 0.4,
          Math.max(3, (chance / most) * longest * grown),
          small * 0.8,
        );
        // The pick is outlined too, so it does not rest on colour.
        if (taken) {
          context.strokeStyle = palette.ink;
          context.lineWidth = 2;
          context.strokeRect(
            margin + labels + 24,
            middle - small * 0.4,
            Math.max(3, (chance / most) * longest),
            small * 0.8,
          );
        }
      });
      context.textAlign = "left";
    },
    picture: (still) => `${story} ${ids.length} ${phase} ${grownBy(still)}`,
    describe: () => words.now.words(storyText(line)),
  };
}
