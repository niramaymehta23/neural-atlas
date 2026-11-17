import { count } from "@/design/copy";
import type { PaintWords } from "@/data/PaintCanvas";

/** A garden's spoken words, from the lesson's captions (each lesson names its own things). */
export type GardenSpeech = {
  instructions: string;
  position: (across: string, up: string) => string;
  planted: (thing: string, across: string, up: string) => string;
  /** The thing each group is, in the singular: ["robin nest", "wren nest"]. */
  things: readonly string[];
  removed: (things: string, across: string, up: string) => string;
  /** "one nest" or "three nests". */
  taken: (count: string, one: boolean) => string;
  nothing: string;
};

/** PaintCanvas words built from a lesson's speech. */
export function paintWords(speech: GardenSpeech): PaintWords {
  return {
    instructions: speech.instructions,
    position: (across, up) => speech.position(String(across), String(up)),
    planted: (group, across, up) =>
      speech.planted(speech.things[group] ?? "", String(across), String(up)),
    removed: (taken, across, up) =>
      speech.removed(
        taken === 0 ? speech.nothing : speech.taken(count(taken), taken === 1),
        String(across),
        String(up),
      ),
  };
}
